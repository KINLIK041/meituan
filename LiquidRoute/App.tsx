import React, { useState, useCallback } from 'react';
import { SafeAreaView, StatusBar, LogBox } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import RouteResultScreen from './src/screens/RouteResultScreen';
import type { Route } from './src/types';

LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

type Screen = 'home' | 'result';

interface ResultData {
  plans: Route[];
  sessionId: string;
  explanation: string;
}

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [resultData, setResultData] = useState<ResultData | null>(null);

  const handleNavigateToResult = useCallback((data: ResultData) => {
    setResultData(data);
    setCurrentScreen('result');
  }, []);

  const handleBack = useCallback(() => {
    setCurrentScreen('home');
    setResultData(null);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F7" />
      {currentScreen === 'home' ? (
        <HomeScreen onNavigateToResult={handleNavigateToResult} />
      ) : resultData ? (
        <RouteResultScreen
          plans={resultData.plans}
          sessionId={resultData.sessionId}
          explanation={resultData.explanation}
          onBack={handleBack}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default App;
