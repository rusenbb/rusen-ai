import "katex/dist/katex.min.css";
import "./blog.css";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `(() => { try { const s = localStorage.getItem('blogLang'); const a = (navigator.language||'').toLowerCase().startsWith('tr') ? 'tr' : 'en'; document.documentElement.dataset.blogLang = s || a; } catch (_) {} })();`,
        }}
      />
      {children}
    </>
  );
}
