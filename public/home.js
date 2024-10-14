const socket = io();

socket.on("message", (message) => {
    let messageElem = document.createElement("p");
    messageElem.innerText = message;
    document.querySelector("#message").append(messageElem);
});

document.querySelector("#sendMessageForm").addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent the form from refreshing the page

    // Get the message input value
    const message = document.querySelector("#messageInput").value;

    // Emit the message to the server
    socket.emit("message", message);

    // Clear the input field after sending the message
    document.querySelector("#messageInput").value = '';
});