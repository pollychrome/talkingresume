async function simulateChats() {
    const messages = [
        "What are your hobbies?",
        "Tell me about your tech journey",
        "What are your key achievements?"
    ];

    for (const message of messages) {
        const response = await fetch('http://localhost:8788/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        console.log(`Sent: ${message}`);
        console.log(`Response:`, await response.json());
        
        // Wait a bit between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

simulateChats().catch(console.error); 