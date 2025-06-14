export default function DefaultOpenGraphImage() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            padding: '48px',
            alignItems: 'center',
            textAlign: 'center',
            justifyContent: 'center',
            color: 'white',
            background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)'
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                maxWidth: '1024px'
            }}>
                <h1 style={{
                    fontSize: '128px',
                    fontWeight: 700,
                    marginBottom: '24px',
                    lineHeight: 1.1
                }}>Thought Eddies</h1>
                <p style={{
                    fontSize: '64px',
                    marginBottom: '32px',
                    opacity: 0.9,
                    lineHeight: 1.4
                }}>An Experimental Digital Garden</p>
                <div style={{
                    fontSize: '32px',
                    opacity: 0.75
                }}>
                    thoughteddies.com
                </div>
            </div>
        </div>
    );
}
