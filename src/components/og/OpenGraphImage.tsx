import { type CollectionEntry } from "astro:content";

export default function OpenGraphImage(props: CollectionEntry<"notes">) {
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
                    fontSize: '96px',
                    fontWeight: 700,
                    marginBottom: '24px',
                    lineHeight: 1.1
                }}>{props.data.title}</h1>
                {props.data.description && (
                    <p style={{
                        fontSize: '48px',
                        marginBottom: '32px',
                        opacity: 0.9,
                        lineHeight: 1.4
                    }}>{props.data.description}</p>
                )}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '32px',
                    opacity: 0.75
                }}>
                    <span style={{ marginRight: '16px' }}>Thought Eddies</span>
                    {props.data.createdAt && (
                        <span style={{ marginLeft: '16px' }}>{new Date(props.data.createdAt).toISOString().split("T")[0]}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
