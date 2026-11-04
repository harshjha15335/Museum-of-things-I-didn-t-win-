import { exhibits, site } from '../content/exhibits';

/**
 * Placeholder for the mobile / no-WebGL fallback (spec F6, built in Phase 4).
 * For now it renders every exhibit's plaque and narration as text so nothing is ever blank.
 */
export function Museum2D() {
  return (
    <main className="m2d">
      <h1 className="start-title">{site.title}</h1>
      <p className="start-sub">{site.subtitle}</p>
      <p className="m2d-note">{site.noWebGL}</p>
      {exhibits.map((ex) => (
        <section key={ex.id} className="m2d-room">
          <div className="kicker">{ex.kicker}</div>
          <h2 className="plaque-title">{ex.title}</h2>
          {ex.narration.length > 0 ? (
            <p>{ex.narration.map((c) => c.text).join(' ')}</p>
          ) : (
            <p>{ex.quickLine}</p>
          )}
        </section>
      ))}
      <footer className="footer static">{site.footer}</footer>
    </main>
  );
}
