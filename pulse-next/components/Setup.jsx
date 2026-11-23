export default function Setup() {
  return (
    <div className="wrap page" style={{ maxWidth: 680 }}>
      <div className="card card-p" style={{ padding: "2rem" }}>
        <h2 style={{ fontSize: "1.8rem", marginBottom: ".6rem" }}>One last step: connect Supabase 🔌</h2>
        <p className="muted" style={{ marginBottom: "1rem" }}>
          Create a <span className="code">.env.local</span> file in the project root (see <span className="code">.env.local.example</span>) and add your project values, then restart the dev server:
        </p>
        <pre className="code" style={{ display: "block", padding: "1rem", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi…`}
        </pre>
        <p className="small muted" style={{ marginTop: "1rem" }}>
          Find them in <b>Supabase → Project Settings → API</b> (Project URL and the <b>anon public</b> key). Never use the <span className="code">service_role</span> key in the browser.
        </p>
      </div>
    </div>
  );
}
