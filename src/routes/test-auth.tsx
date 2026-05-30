import { createFileRoute } from '@tanstack/react-router';
import AuthenticationModule from '@/components/AuthenticationModule';
import { BrowserRouter } from 'react-router-dom';

export const Route = createFileRoute('/test-auth')({
  component: TestAuthPage,
});

function TestAuthPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Teste do Módulo de Autenticação</h1>
      <BrowserRouter>
        <AuthenticationModule />
      </BrowserRouter>
    </div>
  );
}
