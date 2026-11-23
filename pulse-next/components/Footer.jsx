import Link from "next/link";
import { Logo } from "./Ui";

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <Link className="logo" href="/" style={{ marginBottom: ".7rem" }}><span className="brand-logo"><Logo /></span></Link>
            <p style={{ maxWidth: "20rem" }}>Surveys people actually want to answer — built to be shared.</p>
          </div>
          <div><h5>Product</h5><Link href="/create">Create survey</Link><Link href="/discover">Explore</Link><Link href="/dashboard">My surveys</Link></div>
          <div><h5>Discover</h5><Link href="/discover">Trending</Link><Link href="/discover">Quizzes</Link><Link href="/discover">Top creators</Link></div>
          <div><h5>Roadmap</h5><a>AI survey writer</a><a>Branching logic</a><a>Sentiment analysis</a></div>
        </div>
        <div className="foot-bot"><span>© EzeeTik</span><span className="tiny">Powered by Supabase</span></div>
      </div>
    </footer>
  );
}
