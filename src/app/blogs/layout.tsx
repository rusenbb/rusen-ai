import "katex/dist/katex.min.css";
import "./blog.css";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `(() => { let s = null; try { s = localStorage.getItem('blogLang'); } catch (_) {} const a = (navigator.language || '').toLowerCase().startsWith('tr') ? 'tr' : 'en'; document.documentElement.dataset.blogLang = (s === 'en' || s === 'tr') ? s : a; })();`,
        }}
      />
      {children}
    </>
  );
}
