import { Mission } from '../types';

export const generateDailyMissions = (): Mission[] => [
  {
    id: 'water',
    title: 'Beber 1 Copo de Água',
    description: 'Tire uma foto bebendo um copo de água',
    reward: 5,
    completed: false,
    imageRequired: true
  },
  {
    id: 'twitter',
    title: 'Seguir no X (Twitter)',
    description: 'Siga nossa conta no X e tire uma screenshot',
    reward: 5,
    completed: false,
    imageRequired: true
  },
  {
    id: 'instagram',
    title: 'Seguir no Instagram',
    description: 'Siga nossa conta no Instagram e tire uma screenshot',
    reward: 5,
    completed: false,
    imageRequired: true
  },
  {
    id: 'walk',
    title: 'Caminhar por 5 Minutos',
    description: 'Caminhe por 5 minutos e tire uma foto do local',
    reward: 5,
    completed: false,
    imageRequired: true
  },
  {
    id: 'meditation',
    title: 'Meditar por 3 Minutos',
    description: 'Medite por 3 minutos e tire uma selfie relaxada',
    reward: 5,
    completed: false,
    imageRequired: true
  }
];