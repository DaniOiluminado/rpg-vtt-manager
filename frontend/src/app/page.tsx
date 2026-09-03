import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4">
      <h1 className="text-5xl font-bold mb-4 text-indigo-500">VTT RPG Manager</h1>
      <p className="text-zinc-400 mb-8 text-center max-w-lg">
        Organize suas campanhas, gerencie fichas, mapas e convide jogadores para rolagens de dados em tempo real. O seu universo, sob o seu controle.
      </p>
      
      <Link 
        href="/login" 
        className="rounded-md bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700"
      >
        Acessar o VTT
      </Link>
    </div>
  );
}