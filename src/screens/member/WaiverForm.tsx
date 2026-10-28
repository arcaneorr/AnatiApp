import { useId, useState } from 'react';
import { useT } from '../../state/store';
import { Button } from '../../ui/kit';

/** One-screen health declaration. Submitting always moves the flow forward. */
export function WaiverForm({
  forName,
  isChild,
  submitLabel,
  onSubmit,
}: {
  forName: string;
  isChild: boolean;
  submitLabel: string;
  onSubmit: (signature: string) => void;
}) {
  const w = useT().ui.waiver;
  const [healthy, setHealthy] = useState(false);
  const [inform, setInform] = useState(false);
  const [signature, setSignature] = useState('');
  const id = useId();
  const ready = healthy && inform && signature.trim().length >= 2;

  return (
    <form
      className="waiver"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSubmit(signature);
      }}
    >
      <p className="muted small">{w.intro(forName)}</p>
      <label className="check">
        <input type="checkbox" checked={healthy} onChange={(e) => setHealthy(e.target.checked)} />
        <span>{isChild ? w.healthyChild(forName) : w.healthySelf}</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={inform} onChange={(e) => setInform(e.target.checked)} />
        <span>{w.inform}</span>
      </label>
      <label className="field-label" htmlFor={`${id}-sig`}>
        {isChild ? w.sigChild : w.sigSelf}
      </label>
      <input
        id={`${id}-sig`}
        className="input"
        value={signature}
        onChange={(e) => setSignature(e.target.value)}
        autoComplete="name"
      />
      <Button type="submit" block disabled={!ready}>
        {submitLabel}
      </Button>
    </form>
  );
}
