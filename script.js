addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Get the campaign ID from the URL
  const url = new URL(request.url);
  const campaignId = url.pathname.split('/')[1];
  
  if (!campaignId) {
    return new Response('Campaign not found', { status: 404 });
  }
  
  try {
    // Get campaign data
    const rawData = await MY_KV_NAMESPACE.get(campaignId);
    if (!rawData) {
      return new Response('Campaign not found', { status: 404 });
    }

    const campaign = JSON.parse(rawData);
    
    // Get and update counts
    let url1Count = parseInt(await MY_KV_NAMESPACE.get(`${campaignId}_url1_count`) || '0');
    let url2Count = parseInt(await MY_KV_NAMESPACE.get(`${campaignId}_url2_count`) || '0');
    
    // Choose URL based on counts
    let destinationUrl;
    if (url1Count <= url2Count) {
      destinationUrl = campaign.url1;
      await MY_KV_NAMESPACE.put(`${campaignId}_url1_count`, (url1Count + 1).toString());
    } else {
      destinationUrl = campaign.url2;
      await MY_KV_NAMESPACE.put(`${campaignId}_url2_count`, (url2Count + 1).toString());
    }
    
    return Response.redirect(destinationUrl, 302);
  } catch (error) {
    return new Response('Error processing redirect', { status: 500 });
  }
}
