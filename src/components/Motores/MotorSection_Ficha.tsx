import type { FichaOutput } from '../../types/motor-types';

interface Props {
  result: FichaOutput | null;
}

// Runtime may deliver one of three shapes, but the declared type only models
// the direct one, so we widen locally for defensive extraction:
//   1. { ficha_trabajo: {...} }                 -> use result.ficha_trabajo
//   2. { output: { ficha_trabajo: {...} }, ...} -> use result.output.ficha_trabajo
//   3. { titulo_gancho, historia_gancho, ... }  -> result IS the ficha data
type FichaData = FichaOutput['ficha_trabajo'];

export default function MotorSection_Ficha({ result }: Props) {
  if (!result) return null;

  const wrapped = result as FichaOutput & { output?: FichaOutput };
  const ficha: FichaData | undefined =
    wrapped.ficha_trabajo ??
    wrapped.output?.ficha_trabajo ??
    (wrapped as unknown as FichaData); // last-resort: result may itself be the ficha data

  if (!ficha) return null;

  return (
    <div style={{ borderTop: '1px solid #e6e6eb', padding: '1rem' }}>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '0.5rem' }}>
        🎮 Ficha Gamificada
      </div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#DC2626' }}>
        {ficha.titulo_gancho}
      </div>
      <div style={{ fontSize: '0.6875rem', color: '#4a4a5a', marginTop: '0.25rem' }}>
        {ficha.historia_gancho?.slice(0, 200)}
      </div>
    </div>
  );
}
