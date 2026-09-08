import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo';

export default function NotFoundPage() {
  return <div className="not-found container"><Seo title="Página não encontrada" path="/404" noIndex /><span>404</span><h1>Esta ideia não está por aqui.</h1><p>O endereço pode ter mudado. Volte ao catálogo para continuar explorando.</p><Link className="button button--green" to="/catalogo"><ArrowLeft size={17} /> Ir para o catálogo</Link></div>;
}
