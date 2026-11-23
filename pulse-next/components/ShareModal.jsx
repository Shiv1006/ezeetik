"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app-context";
import { bumpShares } from "@/lib/data";
import { downloadCard } from "@/lib/share";
import { shortURL, surveyURL } from "@/lib/utils";
import { BriefcaseBusiness, Copy, Image, Mail, MessageCircle, MessageSquareText, Send, Share2, Smartphone } from "lucide-react";

export default function ShareModal({ s }) {
  const { closeModal, copyText, toast } = useApp();
  const canvasRef = useRef(null);
  const [qrFail, setQrFail] = useState(false);
  const url = surveyURL(s);
  const msg = `Hey! 👋 I just found this interesting survey: "${s.title}" — what would you choose?`;
  const enc = encodeURIComponent;
  const wa = `https://wa.me/?text=${enc(msg + "\n\n" + url)}`;
  const x = `https://twitter.com/intent/tweet?text=${enc(`Quick question 👀 "${s.title}" — what would you choose?`)}&url=${enc(url)}`;
  const tg = `https://t.me/share/url?url=${enc(url)}&text=${enc(msg)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
  const li = `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`;
  const em = `mailto:?subject=${enc("A survey for you: " + s.title)}&body=${enc(msg + "\n\n" + url)}`;
  const sms = `sms:?body=${enc(msg + " " + url)}`;
  const bump = () => bumpShares(s);

  useEffect(() => {
    let live = true;
    import("qrcode")
      .then((m) => { const QR = m.default || m; if (live && canvasRef.current) return QR.toCanvas(canvasRef.current, url, { width: 150, margin: 0, errorCorrectionLevel: "M" }); })
      .catch(() => live && setQrFail(true));
    return () => { live = false; };
  }, [url]);

  function nativeShare() {
    if (navigator.share) { navigator.share({ title: s.title, text: msg, url }).catch(() => {}); bump(); }
    else copyText(url);
  }
  function storyCard() { downloadCard(s, "square"); toast("Share card downloaded 🖼️ — post it anywhere!"); }

  return (
    <>
      <h3 style={{ marginBottom: ".2rem" }}>Share "{s.title}"</h3>
      <p className="muted small">Every share brings new responses.</p>
      <div style={{ display: "flex", gap: ".5rem", margin: "1.1rem 0" }}>
        <input value={url} readOnly onClick={(e) => e.target.select()} />
        <button className="btn btn-p" onClick={() => copyText(url)}><Copy size={16} /> Copy</button>
      </div>
      <div className="share-grid">
        <a className="share-btn" target="_blank" rel="noopener" href={wa} onClick={bump}><span className="si"><MessageCircle size={22} /></span>WhatsApp</a>
        <a className="share-btn" target="_blank" rel="noopener" href={tg} onClick={bump}><span className="si"><Send size={22} /></span>Telegram</a>
        <a className="share-btn" target="_blank" rel="noopener" href={x} onClick={bump}><span className="si"><Share2 size={22} /></span>Twitter / X</a>
        <a className="share-btn" target="_blank" rel="noopener" href={fb} onClick={bump}><span className="si"><Share2 size={22} /></span>Facebook</a>
        <a className="share-btn" target="_blank" rel="noopener" href={li} onClick={bump}><span className="si"><BriefcaseBusiness size={22} /></span>LinkedIn</a>
        <a className="share-btn" href={em} onClick={bump}><span className="si"><Mail size={22} /></span>Email</a>
        <a className="share-btn" href={sms} onClick={bump}><span className="si"><MessageSquareText size={22} /></span>SMS</a>
        <button className="share-btn" onClick={storyCard}><span className="si"><Image size={22} /></span>Story Card</button>
        <button className="share-btn" onClick={nativeShare}><span className="si"><Smartphone size={22} /></span>More…</button>
      </div>
      <p className="muted tiny" style={{ marginBottom: ".3rem" }}>QR code — print it, stick it anywhere:</p>
      <div id="qrbox">
        {qrFail ? <span className="tiny" style={{ color: "#666" }}>{shortURL(s)}</span> : <canvas ref={canvasRef} />}
      </div>
      <div style={{ textAlign: "right", marginTop: "1.1rem" }}>
        <button className="btn btn-k" onClick={closeModal}>Done</button>
      </div>
    </>
  );
}
