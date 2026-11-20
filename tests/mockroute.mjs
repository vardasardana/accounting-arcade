// Sends requests for fake Apps Script ids to the local mocks: AKfyTESTA… -> port 4290, AKfyTESTB… -> port 4291.
export const ID_A = 'AKfyTESTA_mock_deployment_id_0000000001';
export const ID_B = 'AKfyTESTB_mock_deployment_id_0000000002';
export async function routeMocks(p, { blockOthers = true } = {}) {
  await p.route(/script\.google\.com\/macros\/s\//, async (r) => {
    const u = new URL(r.request().url());
    const port = u.pathname.includes(ID_A) ? 4290 : u.pathname.includes(ID_B) ? 4291 : 0;
    if (!port) return blockOthers ? r.abort() : r.continue();
    const res = await fetch(`http://127.0.0.1:${port}/exec${u.search}`, { method: r.request().method(), body: r.request().method() === 'POST' ? r.request().postData() : undefined });
    await r.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: await res.text() });
  });
}
