// ステータスバー（画面上の時計や電波表示）の見た目を設定するために読み込みます
import { StatusBar } from 'expo-status-bar';

// 画面遷移（ナビゲーション）全体を包むための入れ物を読み込みます
import { NavigationContainer } from '@react-navigation/native';

// 「画面を積み重ねて戻れる」タイプのナビゲーションを作る関数を読み込みます
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 画面の上端/下端がノッチ等で隠れないように安全領域を扱うために読み込みます
import { SafeAreaProvider } from 'react-native-safe-area-context';

// 画面の見た目（スタイル）を作るために読み込みます
import { StyleSheet } from 'react-native';

// カメラ画面のコンポーネント（表示する“1つの画面”）を読み込みます
import CameraScreen from './src/screens/Camera/CameraScreen';

// 画像加工画面のコンポーネント（表示する“1つの画面”）を読み込みます
import ImageProcessingScreen from './src/screens/ImageProcessing/ImageProcessingScreen';

// 画面名と、画面へ渡すパラメータの型（TypeScript）を読み込みます
import type { RootStackParamList } from './src/types/navigation';

// 画面遷移の「スタック（積み重ね）」を、このアプリ用の型付きで作ります
const Stack = createNativeStackNavigator<RootStackParamList>();

// この App 関数が、アプリ全体の入り口（最初に表示される土台）です
export default function App() {
  // ここから「画面に何を表示するか」を返します（Reactのルールです）
  return (
    // SafeAreaProvider で、端末の安全領域（ノッチなど）を考慮できるようにします
    <SafeAreaProvider>
      {/* NavigationContainer で、アプリ全体の画面遷移を管理できるようにします。
      この中にStack.Navigatorを置くのが基本パターンです。*/}
      <NavigationContainer>
        {/* Stack.Navigator で、「どんな画面があるか」と「共通設定」をまとめます */}
        <Stack.Navigator
          // headerShown:false で上のヘッダーを非表示、contentStyle で画面の背景などを統一します
          screenOptions={{ headerShown: false, contentStyle: styles.container }}
        >
          {/* name は画面の名前、component は表示する画面の中身（コンポーネント）です */}
          <Stack.Screen name="Camera" component={CameraScreen} />

          {/* 2つ目の画面も同じように登録します（ここへ遷移できるようになります） */}
          <Stack.Screen
            name="ImageProcessing"
            component={ImageProcessingScreen}
          />
        </Stack.Navigator>

        {/* ステータスバーを light（明るい文字）にして、黒背景でも見やすくします */}
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// ここで画面のスタイルをまとめて作ります（毎回新規作成しないので効率がよいです）
const styles = StyleSheet.create({
  // container という名前のスタイルを定義します（画面全体で使います）
  container: {
    // flex:1 で画面いっぱいに広げます
    flex: 1,
    // 背景色を黒にします（カメラ系アプリでよく使う見た目です）
    backgroundColor: '#000',
  },
});
