import React from 'react';
import { FileText, Target, Lock, Coins, Users, TrendingUp } from 'lucide-react';

const WhitepaperPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">DetHabits Whitepaper</h1>
        <p className="text-gray-600">Entenda o ecossistema DetHabits e o token DET</p>
      </div>

      <div className="space-y-8">
        {/* Executive Summary */}
        <section className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="text-purple-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Resumo Executivo</h2>
          </div>
          <p className="text-gray-700 leading-relaxed">
            DetHabits é uma plataforma gamificada que incentiva a formação de hábitos saudáveis através de 
            recompensas em tokens DET. Utilizando a blockchain Solana, oferecemos um sistema transparente e 
            seguro onde usuários completam missões diárias e são recompensados com tokens que podem ser 
            utilizados dentro do ecossistema da plataforma.
          </p>
        </section>

        {/* Mission System */}
        <section className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Target className="text-teal-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Sistema de Missões</h2>
          </div>
          <div className="space-y-4">
            <p className="text-gray-700">
              Cada usuário pode completar até 5 missões diárias, cada uma recompensada com 5 tokens DET. 
              As missões incluem atividades como:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Atividades de saúde (beber água, exercitar-se)</li>
              <li>Engajamento social (seguir redes sociais)</li>
              <li>Mindfulness (meditação, caminhadas)</li>
            </ul>
            <p className="text-gray-700">
              A validação é feita através de upload de imagens, garantindo a veracidade das atividades.
            </p>
          </div>
        </section>

        {/* Tokenomics */}
        <section className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Coins className="text-orange-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Tokenomics DET</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">80%</div>
              <div className="text-sm text-gray-700">Disponível para uso</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">10%</div>
              <div className="text-sm text-gray-700">Stake automático</div>
            </div>
            <div className="bg-teal-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-teal-600">10%</div>
              <div className="text-sm text-gray-700">Reserva plataforma</div>
            </div>
          </div>
          <p className="text-gray-700">
            A distribuição automática garante sustentabilidade do ecossistema e incentiva o holding a longo prazo.
          </p>
        </section>

        {/* Staking System */}
        <section className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Lock className="text-red-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Sistema de Staking</h2>
          </div>
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-2xl font-bold text-red-600">300% ao ano</div>
                <div className="text-sm text-gray-700">Rendimento inicial</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">3 meses</div>
                <div className="text-sm text-gray-700">Período de bloqueio</div>
              </div>
            </div>
          </div>
          <p className="text-gray-700">
            O stake obrigatório de 10% dos ganhos assegura liquidez e estabilidade, com rendimentos atrativos 
            para compensar o período de bloqueio.
          </p>
        </section>

        {/* Roadmap */}
        <section className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Roadmap</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
              <div>
                <div className="font-semibold text-gray-900">Q1 2025 - Lançamento Beta</div>
                <div className="text-gray-600 text-sm">Plataforma básica com missões diárias</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mt-2"></div>
              <div>
                <div className="font-semibold text-gray-900">Q2 2025 - Marketplace</div>
                <div className="text-gray-600 text-sm">Loja com NFTs e itens físicos</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <div className="font-semibold text-gray-900">Q3 2025 - Social Features</div>
                <div className="text-gray-600 text-sm">Ranking e competições entre usuários</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full mt-2"></div>
              <div>
                <div className="font-semibold text-gray-900">Q4 2025 - DAO</div>
                <div className="text-gray-600 text-sm">Governança descentralizada</div>
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="text-green-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Equipe</h2>
          </div>
          <p className="text-gray-700">
            DetHabits é desenvolvido por uma equipe experiente em blockchain, gamificação e wellness, 
            com foco em criar uma plataforma sustentável que genuinamente incentive hábitos saudáveis.
          </p>
        </section>
      </div>
    </div>
  );
};

export default WhitepaperPage;