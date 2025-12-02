const WebSocket = require('ws');

const PORT = process.env.PORT || process.env.SIGNALING_PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// Store active streams: streamId -> { broadcaster: ws, viewers: Set<ws> }
const streams = new Map();

console.log(`Signaling server running on port ${PORT}`);

wss.on('connection', (ws) => {
  let currentStreamId = null;
  let role = null; // 'broadcaster' or 'viewer'

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`[${data.streamId || 'unknown'}] Received:`, data.type);

      switch (data.type) {
        case 'join-as-broadcaster':
          currentStreamId = data.streamId;
          role = 'broadcaster';

          if (!streams.has(currentStreamId)) {
            streams.set(currentStreamId, { broadcaster: null, viewers: new Set() });
          }
          streams.get(currentStreamId).broadcaster = ws;
          console.log(`[${currentStreamId}] Broadcaster joined`);

          // Notify existing viewers that broadcaster is available
          const stream = streams.get(currentStreamId);
          stream.viewers.forEach(viewer => {
            viewer.send(JSON.stringify({ type: 'broadcaster-available' }));
          });
          break;

        case 'join-as-viewer':
          currentStreamId = data.streamId;
          role = 'viewer';

          if (!streams.has(currentStreamId)) {
            streams.set(currentStreamId, { broadcaster: null, viewers: new Set() });
          }
          streams.get(currentStreamId).viewers.add(ws);
          console.log(`[${currentStreamId}] Viewer joined (${streams.get(currentStreamId).viewers.size} total)`);

          // If broadcaster exists, notify viewer
          if (streams.get(currentStreamId).broadcaster) {
            ws.send(JSON.stringify({ type: 'broadcaster-available' }));
          }
          break;

        case 'request-stream':
          // Viewer requesting stream from broadcaster
          if (currentStreamId && streams.has(currentStreamId)) {
            const broadcaster = streams.get(currentStreamId).broadcaster;
            if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
              broadcaster.send(JSON.stringify({
                type: 'viewer-request',
                viewerId: getViewerId(ws, currentStreamId)
              }));
              console.log(`[${currentStreamId}] Stream request forwarded to broadcaster`);
            }
          }
          break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
          // Relay WebRTC signaling messages
          if (currentStreamId && streams.has(currentStreamId)) {
            const streamData = streams.get(currentStreamId);

            if (role === 'broadcaster') {
              // Send to specific viewer or broadcast to all viewers
              const targetViewer = data.targetViewerId
                ? findViewerById(streamData.viewers, data.targetViewerId)
                : null;

              if (targetViewer) {
                targetViewer.send(JSON.stringify({
                  type: data.type,
                  data: data.data
                }));
              } else {
                // Broadcast to all viewers
                streamData.viewers.forEach(viewer => {
                  if (viewer.readyState === WebSocket.OPEN) {
                    viewer.send(JSON.stringify({
                      type: data.type,
                      data: data.data
                    }));
                  }
                });
              }
              console.log(`[${currentStreamId}] ${data.type} sent to viewer(s)`);
            } else if (role === 'viewer') {
              // Send to broadcaster
              if (streamData.broadcaster && streamData.broadcaster.readyState === WebSocket.OPEN) {
                streamData.broadcaster.send(JSON.stringify({
                  type: data.type,
                  data: data.data,
                  viewerId: getViewerId(ws, currentStreamId)
                }));
                console.log(`[${currentStreamId}] ${data.type} sent to broadcaster`);
              }
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    if (currentStreamId && streams.has(currentStreamId)) {
      const streamData = streams.get(currentStreamId);

      if (role === 'broadcaster') {
        streamData.broadcaster = null;
        console.log(`[${currentStreamId}] Broadcaster left`);
        // Notify viewers
        streamData.viewers.forEach(viewer => {
          if (viewer.readyState === WebSocket.OPEN) {
            viewer.send(JSON.stringify({ type: 'broadcaster-left' }));
          }
        });
      } else if (role === 'viewer') {
        streamData.viewers.delete(ws);
        console.log(`[${currentStreamId}] Viewer left (${streamData.viewers.size} remaining)`);
      }

      // Clean up empty streams
      if (!streamData.broadcaster && streamData.viewers.size === 0) {
        streams.delete(currentStreamId);
        console.log(`[${currentStreamId}] Stream cleaned up`);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Helper to generate viewer ID
function getViewerId(ws, streamId) {
  // Use a simple approach - find index in viewers set
  if (streams.has(streamId)) {
    const viewers = Array.from(streams.get(streamId).viewers);
    const index = viewers.indexOf(ws);
    return index >= 0 ? `viewer-${index}` : `viewer-${Date.now()}`;
  }
  return `viewer-${Date.now()}`;
}

function findViewerById(viewers, viewerId) {
  const index = parseInt(viewerId.replace('viewer-', ''));
  const viewerArray = Array.from(viewers);
  return viewerArray[index] || null;
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down signaling server...');
  wss.close(() => {
    process.exit(0);
  });
});
