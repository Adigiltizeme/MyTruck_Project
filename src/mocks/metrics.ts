import { subDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FilterOptions, HistoriqueData, MetricData } from '../types/metrics';

const generateDailyData = (daysCount: number) => {
  const today = new Date();
  const stores = ['truffaut-rosny', 'truffaut-ivry'];
  const totalChauffeursActifs = 50;

  // Générer des données de base pour chaque magasin
  const baseData = stores.map(store => {
    const chauffeursActifs = totalChauffeursActifs / stores.length; // 25 par magasin
    const baseNumber = store === 'truffaut-rosny' ? 40 : 25;
    const enCours = Math.floor(baseNumber * 0.3);
    const enAttente = Math.floor(baseNumber * 0.2);

    return {
      store,
      baseNumber,
      enCours,
      enAttente,
      performance: 90 + Math.floor(Math.random() * 5),
      chauffeursActifs
    };
  });

  return baseData.flatMap(storeData => {
    return Array.from({ length: daysCount }, (_, i) => {
      const date = subDays(today, daysCount - 1 - i);
      return {
        date: format(date, 'EEE', { locale: fr }),
        store: storeData.store,
        totalLivraisons: storeData.baseNumber + Math.floor(Math.random() * 10),
        performance: storeData.performance,
        chiffreAffaires: storeData.baseNumber * 350 + Math.floor(Math.random() * 1000),
        enCours: storeData.enCours,
        enAttente: storeData.enAttente,
        chauffeursActifs: 25
      };
    });
  }); 
};

const generateWeeklyData = (weekCount: number) => {
  const today = new Date();
  const stores = ['truffaut-rosny', 'truffaut-ivry'];

  const baseData = stores.map(store => {
    const baseNumber = store === 'truffaut-rosny' ? 70 : 45;
    return Array.from({ length: weekCount }, (_, i) => {
      const date = subDays(today, (weekCount - i) * 7);
      const variation = Math.floor(Math.random() * 10) - 5;

      return {
        date: format(date, 'd MMM', { locale: fr }),
        store,
        totalLivraisons: baseNumber + variation,
        performance: 90 + Math.floor(Math.random() * 8) - 4,
        chiffreAffaires: (baseNumber + variation) * 350,
        enCours: Math.floor(baseNumber * 0.3),
        enAttente: Math.floor(baseNumber * 0.2),
        chauffeursActifs: store === 'truffaut-rosny' ? 15 : 10
      };
    });
  });

  return baseData.flat().sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

const generateMonthlyData = (monthsCount: number) => {
  const today = new Date();
  const stores = ['truffaut-rosny', 'truffaut-ivry'];

  const baseData = stores.map(store => {
    const baseNumber = store === 'truffaut-rosny' ? 150 : 100;
    return Array.from({ length: monthsCount }, (_, i) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (monthsCount - 1 - i), 1);
      const variation = Math.floor(Math.random() * 20) - 10;

      return {
        date: format(date, 'MMM', { locale: fr }),
        store,
        totalLivraisons: baseNumber + variation,
        performance: 90 + Math.floor(Math.random() * 8) - 4,
        chiffreAffaires: (baseNumber + variation) * 350,
        enCours: Math.floor(baseNumber * 0.3),
        enAttente: Math.floor(baseNumber * 0.2),
        chauffeursActifs: store === 'truffaut-rosny' ? 15 : 10
      };
    });
  });

  return baseData.flat().sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};


// Cache pour maintenir les données stables
let dataCache: {
  [key in FilterOptions['dateRange']]?: MetricData;
} = {};

export const generateMetricsData = (dateRange: FilterOptions['dateRange']): MetricData => {
  // Si les données sont déjà en cache, les retourner
  if (dataCache[dateRange]) {
    return dataCache[dateRange]!;
  }

  let historique;

  switch (dateRange) {
    case 'week':
      historique = generateWeeklyData(4);
      break;
    case 'month':
      historique = generateMonthlyData(12);
      break;
    case 'year':
      historique = generateMonthlyData(12);
      break;
    default:
      historique = generateDailyData(7);
  }

  // Récupérer les dernières données pour chaque magasin
  const lastDataByStore = historique.reduce((acc: { [key: string]: HistoriqueData }, curr) => {
    const existingData = acc[curr.store];
    if (!existingData || new Date(curr.date) > new Date(existingData.date)) {
      acc[curr.store] = curr;
    }
    return acc;
  }, {});

  const latestDataArray = Object.values(lastDataByStore);
  const totals = {
    totalLivraisons: latestDataArray.reduce((sum, d) => sum + d.totalLivraisons, 0),
    performance: Math.round(latestDataArray.reduce((sum, d) => sum + d.performance, 0) / latestDataArray.length),
    chiffreAffaires: latestDataArray.reduce((sum, d) => sum + d.chiffreAffaires, 0),
    enCours: latestDataArray.reduce((sum, d) => sum + d.enCours, 0),
    enAttente: latestDataArray.reduce((sum, d) => sum + d.enAttente, 0),
    chauffeursActifs: latestDataArray.reduce((sum, d) => sum + (d.chauffeursActifs ?? 0), 0)
  };

  // Stocker dans le cache
  dataCache[dateRange] = {
    ...totals,
    historique,
    statutsDistribution: {
      enAttente: 0.25,
      enCours: 0.35,
      termine: 0.30,
      echec: 0.10
    }
  };

  return dataCache[dateRange]!;
};