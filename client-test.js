const { io } = require("socket.io-client");

// Ganti string kosong ini dengan Token JWT asli dari Postman
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Niwicm9sZSI6Im1hbmFnZXIiLCJpYXQiOjE3OTE4MDg2ODEsImV4cCI6MTc5MTgzNzQ4MX0.H3UoNlVQl7_Xc5uo-lu99WrfjfRkIlW2Pfpcy9X4v7Y"; 

const socket = io("http://localhost:3000", {
    auth: { token: TOKEN }
});

socket.on("connect", () => {
    console.log("✅ Terhubung! ID Socket:", socket.id);
});

// Listener Event (Akan bereaksi jika server memancarkan event ini)
socket.on("task:created", (data) => {
    console.log("🔔 [EVENT] Task baru dibuat:", data);
});

socket.on("task:assigned", (data) => {
    console.log("🎯 [EVENT] Anda di-assign ke task:", data);
});

socket.on("task:updated", (data) => {
    console.log("📝 [EVENT] Update Task:", data);
});

socket.on("connect_error", (err) => {
    console.error("❌ Gagal terhubung:", err.message);
});