import React, { useState, useRef } from 'react';
import { Camera, Upload, Check, Gift } from 'lucide-react';
import { generateDailyMissions } from '../data/missions';
import { useWallet } from '../context/WalletContext';
import { Mission } from '../types';

const MissionsPage: React.FC = () => {
  const { user, completeMission } = useWallet();
  const [missions, setMissions] = useState<Mission[]>(generateDailyMissions());
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMissionClick = (missionId: string) => {
    if (user?.completedMissions.includes(missionId)) return;
    setSelectedMission(missionId);
    
    // Trigger camera/file input
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.capture = 'environment';
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedMission) {
      // In a real app, you would upload the image to a server for validation
      // For now, we'll just complete the mission
      const mission = missions.find(m => m.id === selectedMission);
      if (mission) {
        completeMission(selectedMission, mission.reward);
        setMissions(prev => 
          prev.map(m => 
            m.id === selectedMission 
              ? { ...m, completed: true, completedAt: new Date() }
              : m
          )
        );
      }
      setSelectedMission(null);
    }
  };

  const completedCount = user?.completedMissions.length || 0;
  const totalRewards = completedCount * 5;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Missões Diárias</h1>
        <p className="text-gray-600">Complete as missões e ganhe tokens DET</p>
        
        <div className="mt-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Gift className="text-purple-600" size={24} />
              <div>
                <p className="font-semibold text-gray-900">Progresso Hoje</p>
                <p className="text-sm text-gray-600">{completedCount}/5 missões completas</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-600">{totalRewards} DET</p>
              <p className="text-sm text-gray-500">Ganhos de hoje</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {missions.map((mission) => {
          const isCompleted = user?.completedMissions.includes(mission.id);
          
          return (
            <div
              key={mission.id}
              className={`bg-white rounded-2xl p-6 shadow-sm border-2 transition-all duration-200 ${
                isCompleted
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 hover:border-purple-300 hover:shadow-md cursor-pointer'
              }`}
              onClick={() => !isCompleted && handleMissionClick(mission.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {isCompleted ? (
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="text-white" size={20} />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Camera className="text-purple-600" size={20} />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{mission.title}</h3>
                      <p className="text-sm text-gray-600">{mission.description}</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isCompleted
                      ? 'bg-green-100 text-green-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {isCompleted ? 'Completa' : `+${mission.reward} DET`}
                  </div>
                  {!isCompleted && (
                    <div className="flex items-center justify-end mt-2 text-purple-600">
                      <Upload size={16} className="mr-1" />
                      <span className="text-xs">Enviar foto</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleImageUpload}
      />

      <div className="mt-8 text-center text-gray-500">
        <p className="text-sm">As missões são renovadas a cada 24 horas</p>
      </div>
    </div>
  );
};

export default MissionsPage;