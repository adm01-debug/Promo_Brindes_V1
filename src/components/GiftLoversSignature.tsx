import './GiftLoversSignature.css';

export function GiftLoversSignature({ variant = 'manifesto' }: { variant?: 'manifesto' | 'footer' }) {
  return (
    <div className={`gift-lovers gift-lovers--${variant}`} lang="en">
      <span className="gift-lovers__name">Gift <span className="gift-lovers__accent">Lovers</span></span>{' '}
      <span className="gift-lovers__credit">by Promo</span>
    </div>
  );
}
