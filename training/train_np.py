"""Hand-rolled NumPy CNN trainer (the sandbox can't fit TensorFlow, and the 45s
execution cap requires resumable training). Architecture mirrors src/nn.js exactly:
  conv3x3x16-relu / maxpool2 / conv3x3x32-relu / maxpool2 / flatten
  (dropout 0.25 train-only) / dense96-relu / dense12-softmax   — channels-last.

Modes:
  python3 train_np.py gradcheck
  python3 train_np.py train <data_dir> <state.npz> <time_budget_s> [epochs] [lr]
  python3 train_np.py eval  <data_dir> <state.npz>
  python3 train_np.py export <data_dir> <state.npz> <model.json> <golden.json>
"""
import base64, json, sys, time
import numpy as np

K = 3

def im2col(x, k):
    N, H, W, C = x.shape
    oh, ow = H - k + 1, W - k + 1
    s = x.strides
    v = np.lib.stride_tricks.as_strided(x, (N, oh, ow, k, k, C), (s[0], s[1], s[2], s[1], s[2], s[3]))
    return np.ascontiguousarray(v).reshape(N, oh * ow, k * k * C), oh, ow

def conv_fwd(x, W, b):
    k, _, ic, oc = W.shape
    cols, oh, ow = im2col(x, k)
    out = cols @ W.reshape(k * k * ic, oc) + b
    return out.reshape(x.shape[0], oh, ow, oc), cols

def conv_bwd(dout, cols, x_shape, W):
    k, _, ic, oc = W.shape
    N, H, Wd, C = x_shape
    oh, ow = H - k + 1, Wd - k + 1
    do = dout.reshape(N, oh * ow, oc)
    dW = np.einsum('npk,npo->ko', cols, do, optimize=True).reshape(k, k, ic, oc)
    db = do.sum((0, 1))
    dcols = (do @ W.reshape(k * k * ic, oc).T).reshape(N, oh, ow, k, k, C)
    dx = np.zeros(x_shape, dtype=dout.dtype)
    for ky in range(k):
        for kx in range(k):
            dx[:, ky:ky + oh, kx:kx + ow, :] += dcols[:, :, :, ky, kx, :]
    return dx, dW, db

def pool_fwd(x):
    N, H, W, C = x.shape
    oh, ow = H // 2, W // 2
    xr = x[:, :oh * 2, :ow * 2, :].reshape(N, oh, 2, ow, 2, C).transpose(0, 1, 3, 2, 4, 5).reshape(N, oh, ow, 4, C)
    idx = xr.argmax(3)
    out = np.take_along_axis(xr, idx[:, :, :, None, :], 3).squeeze(3)
    return out, idx

def pool_bwd(dout, idx, x_shape):
    N, H, W, C = x_shape
    oh, ow = H // 2, W // 2
    dxr = np.zeros((N, oh, ow, 4, C), dtype=dout.dtype)
    np.put_along_axis(dxr, idx[:, :, :, None, :], dout[:, :, :, None, :], 3)
    dx = dxr.reshape(N, oh, ow, 2, 2, C).transpose(0, 1, 3, 2, 4, 5).reshape(N, oh * 2, ow * 2, C)
    if H % 2 or W % 2:
        full = np.zeros(x_shape, dtype=dout.dtype)
        full[:, :oh * 2, :ow * 2, :] = dx
        dx = full
    return dx

def forward(params, x, drop_mask=None):
    c1, cols1 = conv_fwd(x, params['W1'], params['b1'])
    r1 = np.maximum(c1, 0)
    p1, idx1 = pool_fwd(r1)
    c2, cols2 = conv_fwd(p1, params['W2'], params['b2'])
    r2 = np.maximum(c2, 0)
    p2, idx2 = pool_fwd(r2)
    f = p2.reshape(x.shape[0], -1)
    fd = f * drop_mask if drop_mask is not None else f
    h = fd @ params['W3'] + params['b3']
    rh = np.maximum(h, 0)
    logits = rh @ params['W4'] + params['b4']
    cache = (x, cols1, c1, r1, p1, idx1, cols2, c2, r2, p2, idx2, f, fd, h, rh)
    return logits, cache

def backward(params, logits, y, cache, drop_mask=None):
    x, cols1, c1, r1, p1, idx1, cols2, c2, r2, p2, idx2, f, fd, h, rh = cache
    N = x.shape[0]
    m = logits.max(1, keepdims=True)
    e = np.exp(logits - m)
    probs = e / e.sum(1, keepdims=True)
    loss = -np.log(np.maximum(probs[np.arange(N), y], 1e-12)).mean()
    dlogits = probs.copy()
    dlogits[np.arange(N), y] -= 1.0
    dlogits /= N
    g = {}
    g['W4'] = rh.T @ dlogits; g['b4'] = dlogits.sum(0)
    drh = dlogits @ params['W4'].T
    dh = drh * (h > 0)
    g['W3'] = fd.T @ dh; g['b3'] = dh.sum(0)
    dfd = dh @ params['W3'].T
    df = dfd * drop_mask if drop_mask is not None else dfd
    dp2 = df.reshape(p2.shape)
    dr2 = pool_bwd(dp2, idx2, r2.shape)
    dc2 = dr2 * (c2 > 0)
    dp1, g['W2'], g['b2'] = conv_bwd(dc2, cols2, p1.shape, params['W2'])
    dr1 = pool_bwd(dp1, idx1, r1.shape)
    dc1 = dr1 * (c1 > 0)
    _, g['W1'], g['b1'] = conv_bwd(dc1, cols1, x.shape, params['W1'])
    return loss, g

def init_params(nc, rng, dtype=np.float32):
    def he(shape, fan_in):
        return (rng.standard_normal(shape) * np.sqrt(2.0 / fan_in)).astype(dtype)
    return {
        'W1': he((K, K, 1, 16), K * K * 1),   'b1': np.zeros(16, dtype),
        'W2': he((K, K, 16, 32), K * K * 16), 'b2': np.zeros(32, dtype),
        'W3': he((800, 96), 800),             'b3': np.zeros(96, dtype),
        'W4': he((96, nc), 96),               'b4': np.zeros(nc, dtype),
    }

PKEYS = ['W1', 'b1', 'W2', 'b2', 'W3', 'b3', 'W4', 'b4']

def gradcheck():
    rng = np.random.default_rng(1)
    nc = 3
    p = {
        'W1': rng.standard_normal((K, K, 1, 3)) * 0.3, 'b1': rng.standard_normal(3) * 0.1,
        'W2': rng.standard_normal((K, K, 3, 4)) * 0.3, 'b2': rng.standard_normal(4) * 0.1,
    }
    x = rng.standard_normal((4, 12, 12, 1))
    y = np.array([0, 1, 2, 1])
    # flatten dim: 12->10->5->3->1 => 1*1*4=4
    p['W3'] = rng.standard_normal((4, 6)) * 0.3; p['b3'] = rng.standard_normal(6) * 0.1
    p['W4'] = rng.standard_normal((6, nc)) * 0.3; p['b4'] = rng.standard_normal(nc) * 0.1

    logits, cache = forward(p, x)
    _, g = backward(p, logits, y, cache)

    def loss_of(pp):
        lg, _ = forward(pp, x)
        m = lg.max(1, keepdims=True); e = np.exp(lg - m)
        pr = e / e.sum(1, keepdims=True)
        return -np.log(np.maximum(pr[np.arange(4), y], 1e-12)).mean()

    eps, worst = 1e-6, 0.0
    rs = np.random.RandomState(0)
    for key in PKEYS:
        flat = p[key].reshape(-1)
        for _ in range(8):
            i = rs.randint(flat.size)
            keep = flat[i]
            flat[i] = keep + eps; lp = loss_of(p)
            flat[i] = keep - eps; lm = loss_of(p)
            flat[i] = keep
            num = (lp - lm) / (2 * eps)
            ana = g[key].reshape(-1)[i]
            rel = abs(num - ana) / max(1e-8, abs(num) + abs(ana))
            worst = max(worst, rel)
    print(f"GRADCHECK worst_rel_err={worst:.2e}")
    assert worst < 1e-5, "GRADCHECK FAILED"
    print("GRADCHECK PASSED")

def load_data(data_dir, split):
    x = np.fromfile(f"{data_dir}/{split}_x.u8", dtype=np.uint8).reshape(-1, 28, 28, 1)
    y = np.fromfile(f"{data_dir}/{split}_y.u8", dtype=np.uint8).astype(np.int64)
    return x, y

def train(data_dir, state_path, budget_s, epochs=6, lr=1e-3):
    t0 = time.time()
    xt_u8, yt = load_data(data_dir, 'train')
    classes = json.load(open(f"{data_dir}/classes.json"))
    nc = len(classes)
    N = xt_u8.shape[0]
    B = 256
    nb = N // B
    try:
        st = dict(np.load(state_path))
        params = {k: st[k] for k in PKEYS}
        adam_m = {k: st['m_' + k] for k in PKEYS}
        adam_v = {k: st['v_' + k] for k in PKEYS}
        step, epoch, bi = int(st['step']), int(st['epoch']), int(st['bi'])
        print(f"resumed: epoch {epoch} batch {bi}/{nb} step {step}")
    except FileNotFoundError:
        rng = np.random.default_rng(42)
        params = init_params(nc, rng)
        adam_m = {k: np.zeros_like(params[k]) for k in PKEYS}
        adam_v = {k: np.zeros_like(params[k]) for k in PKEYS}
        step, epoch, bi = 0, 0, 0
        print("fresh init")

    b1m, b2m, epsl = 0.9, 0.999, 1e-7
    drng = np.random.default_rng(1234 + step)
    losses = []
    while epoch < epochs:
        perm = np.random.RandomState(1000 + epoch).permutation(N)
        cur_lr = lr if epoch < 4 else lr * 0.3
        while bi < nb:
            if time.time() - t0 > budget_s:
                save(state_path, params, adam_m, adam_v, step, epoch, bi)
                print(f"PAUSED epoch {epoch} batch {bi}/{nb} loss {np.mean(losses):.4f}" if losses else f"PAUSED epoch {epoch} batch {bi}/{nb}")
                return
            sel = perm[bi * B:(bi + 1) * B]
            x = xt_u8[sel].astype(np.float32) / 255.0
            y = yt[sel]
            mask = (drng.random((B, 800)) > 0.25).astype(np.float32) / 0.75
            logits, cache = forward(params, x, mask)
            loss, g = backward(params, logits, y, cache, mask)
            losses.append(loss)
            step += 1
            for k in PKEYS:
                adam_m[k] = b1m * adam_m[k] + (1 - b1m) * g[k]
                adam_v[k] = b2m * adam_v[k] + (1 - b2m) * g[k] * g[k]
                mh = adam_m[k] / (1 - b1m ** step)
                vh = adam_v[k] / (1 - b2m ** step)
                params[k] -= (cur_lr * mh / (np.sqrt(vh) + epsl)).astype(params[k].dtype)
            bi += 1
        print(f"epoch {epoch} done, mean loss {np.mean(losses):.4f}")
        losses = []
        epoch += 1; bi = 0
    save(state_path, params, adam_m, adam_v, step, epoch, bi)
    print("TRAINING_COMPLETE")

def save(path, params, m, v, step, epoch, bi):
    out = {k: params[k] for k in PKEYS}
    out.update({'m_' + k: m[k] for k in PKEYS})
    out.update({'v_' + k: v[k] for k in PKEYS})
    out.update({'step': step, 'epoch': epoch, 'bi': bi})
    np.savez(path, **out)

def batched_predict(params, x_u8, bs=512):
    outs = []
    for i in range(0, x_u8.shape[0], bs):
        x = x_u8[i:i + bs].astype(np.float32) / 255.0
        logits, _ = forward(params, x)
        outs.append(logits)
    return np.concatenate(outs)

def evaluate(data_dir, state_path):
    xv, yv = load_data(data_dir, 'val')
    classes = json.load(open(f"{data_dir}/classes.json"))
    st = dict(np.load(state_path))
    params = {k: st[k] for k in PKEYS}
    logits = batched_predict(params, xv)
    pred = logits.argmax(1)
    acc = (pred == yv).mean()
    nc = len(classes)
    cm = np.zeros((nc, nc), dtype=int)
    for t, p in zip(yv, pred):
        cm[t][p] += 1
    print("Per-class val acc:")
    for i, c in enumerate(classes):
        row = cm[i].sum()
        top_conf = sorted(((cm[i][j], classes[j]) for j in range(nc) if j != i), reverse=True)[0]
        print(f"  {c:<10} {cm[i][i]/max(1,row)*100:5.1f}%   worst-confusion: {top_conf[1]} ({top_conf[0]})")
    print(f"VAL_ACC {acc:.4f}")

def export(data_dir, state_path, model_out, golden_out):
    classes = json.load(open(f"{data_dir}/classes.json"))
    st = dict(np.load(state_path))
    params = {k: st[k] for k in PKEYS}
    b64 = lambda a: base64.b64encode(np.ascontiguousarray(a, np.float32).tobytes()).decode()
    layers = [
        {"type": "conv2d", "kh": K, "kw": K, "ic": 1, "oc": 16, "w": b64(params['W1']), "b": b64(params['b1'])},
        {"type": "maxpool2"},
        {"type": "conv2d", "kh": K, "kw": K, "ic": 16, "oc": 32, "w": b64(params['W2']), "b": b64(params['b2'])},
        {"type": "maxpool2"},
        {"type": "dense", "in": 800, "out": 96, "act": "relu", "w": b64(params['W3']), "b": b64(params['b3'])},
        {"type": "dense", "in": 96, "out": len(classes), "act": "softmax", "w": b64(params['W4']), "b": b64(params['b4'])},
    ]
    json.dump({"version": 1, "prep": "v1", "classes": classes, "layers": layers}, open(model_out, 'w'))
    print(f"MODEL_WRITTEN {model_out}")
    xv, yv = load_data(data_dir, 'val')
    idx = np.random.RandomState(0).choice(xv.shape[0], 64, replace=False)
    logits = batched_predict(params, xv[idx])
    m = logits.max(1, keepdims=True); e = np.exp(logits - m)
    probs = e / e.sum(1, keepdims=True)
    gx = (xv[idx].reshape(64, -1).astype(np.float32) / 255.0)
    json.dump({"inputs": gx.tolist(), "probs": probs.tolist(), "labels": yv[idx].tolist()}, open(golden_out, 'w'))
    print(f"GOLDEN_WRITTEN {golden_out}")

if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'gradcheck':
        gradcheck()
    elif mode == 'train':
        train(sys.argv[2], sys.argv[3], float(sys.argv[4]),
              int(sys.argv[5]) if len(sys.argv) > 5 else 6,
              float(sys.argv[6]) if len(sys.argv) > 6 else 1e-3)
    elif mode == 'eval':
        evaluate(sys.argv[2], sys.argv[3])
    elif mode == 'export':
        export(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
