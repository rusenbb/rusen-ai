interface Props {
  num: string;
  title: React.ReactNode;
  count: string;
  /** Shown between the header and the entries, e.g. the series chain. */
  strip?: React.ReactNode;
  children: React.ReactNode;
}

/** One block of the blog index: a series or the standalone posts. Always
 *  open, so every post is visible without a click. */
export default function BlogSection({ num, title, count, strip, children }: Props) {
  return (
    <section className="idx-section">
      <div className="idx-section-head">
        <span className="sec-num">{num}</span>
        <h2 className="sec-title">{title}</h2>
        <span className="dashed-rule" />
        <span className="sec-count">{count}</span>
      </div>
      {strip}
      <div className="idx-section-body">{children}</div>
    </section>
  );
}
