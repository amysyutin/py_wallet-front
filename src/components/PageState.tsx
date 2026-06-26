type PageStateProps = { title: string; message?: string };
export function PageState({ title, message }: PageStateProps) {
  return <section className="state-panel"><h2>{title}</h2>{message ? <p className="muted">{message}</p> : null}</section>;
}
