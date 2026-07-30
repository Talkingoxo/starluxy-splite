export default {
  async fetch(request) {
    const url = new URL(request.url);
    return Response.json({
      ok: true,
      service: "starluxy-splite",
      path: url.pathname,
      method: request.method
    });
  }
};
