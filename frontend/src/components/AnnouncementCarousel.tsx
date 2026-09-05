'use client';

// Dados provisórios. Futuramente virão do Supabase.
const announcements = [
  { id: 1, date: 'SEX 04/09/2026', title: 'Atualização de Fichas', desc: 'Novo modelo customizável adicionado ao sistema.' },
  { id: 2, date: 'SEG 07/09/2026', title: 'Manutenção Programada', desc: 'Servidores offline na madrugada de terça-feira.' },
  { id: 3, date: 'QUA 16/09/2026', title: 'Novo Sistema: Cyberpunk', desc: 'Suporte nativo para rolagens de d10 adicionado.' },
  { id: 4, date: 'SEX 04/09/2026', title: 'Atualização de Fichas', desc: 'Novo modelo customizável adicionado ao sistema.' }, // Duplicado para manter o loop
];

export default function AnnouncementCarousel() {
  return (
    <div className="border-b border-codice-dark/20 bg-codice-dark/5 py-3 overflow-hidden">
      <div className="mx-auto max-w-7xl flex items-center px-6">
        <span className="shrink-0 font-bold text-codice-dark mr-4 border-r border-codice-dark/30 pr-4 uppercase text-sm tracking-wider">
          Avisos
        </span>
        
        {/* Contêiner de Animação */}
        <div className="group relative flex w-full overflow-hidden">
          <div className="flex w-max animate-ticker group-hover:[animation-play-state:paused]">
            
            {/* Duplicamos a lista para a transição do loop ser imperceptível */}
            {[...announcements, ...announcements].map((item, index) => (
              <div 
                key={index} 
                className="group/item flex w-[400px] flex-col px-6 border-r border-codice-dark/10 opacity-60 transition-opacity duration-300 hover:opacity-100 cursor-default"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-codice-red">{item.date}</span>
                  <h4 className="text-sm font-bold text-codice-dark truncate">{item.title}</h4>
                </div>
                <p className="text-xs text-codice-dark/80 truncate group-hover/item:text-clip group-hover/item:whitespace-normal">
                  {item.desc}
                </p>
              </div>
            ))}

          </div>
        </div>
      </div>
    </div>
  );
}