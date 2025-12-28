// Test WebSocket connection to local server
const io = require('socket.io-client');

const serverUrl = 'http://localhost:3300';
const testToken = 'your_jwt_token_here'; // Replace with real token from login

console.log('🔗 Testing WebSocket connection...');
console.log('📍 Server URL:', serverUrl);

const socket = io(serverUrl, {
  transports: ['websocket', 'polling'],
  auth: {
    token: testToken
  },
  query: {
    userId: 'test-user-id'
  }
});

socket.on('connect', () => {
  console.log('✅ WebSocket connected!');
  console.log('📍 Socket ID:', socket.id);
  
  // Test sending a message
  console.log('📤 Sending test message...');
  socket.emit('send-message', {
    receiverId: 'test-receiver-id',
    content: 'Test message',
    messageType: 'text'
  });
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection error:', error.message);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected');
});

socket.on('connected', (data) => {
  console.log('🎉 Server confirmation:', data);
});

socket.on('message-sent', (data) => {
  console.log('✅ Message sent:', data);
});

socket.on('message-error', (data) => {
  console.log('❌ Message error:', data);
});

// Keep script running
setTimeout(() => {
  console.log('⏱️ Test completed');
  socket.disconnect();
  process.exit(0);
}, 5000);






