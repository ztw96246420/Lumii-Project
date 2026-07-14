import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

import { captureLumiiRuntimeError } from '../services/runtimeErrors';

type LumiiErrorBoundaryProps = {
  children: ReactNode;
};

type LumiiErrorBoundaryState = {
  failed: boolean;
  retryKey: number;
};

export default class LumiiErrorBoundary extends Component<LumiiErrorBoundaryProps, LumiiErrorBoundaryState> {
  state: LumiiErrorBoundaryState = { failed: false, retryKey: 0 };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    void captureLumiiRuntimeError(error, {
      componentStack: info.componentStack,
      fatal: false,
      kind: 'render',
    });
  }

  private retry = () => {
    this.setState((state) => ({ failed: false, retryKey: state.retryKey + 1 }));
  };

  render() {
    if (!this.state.failed) return <View key={this.state.retryKey} style={styles.appRoot}>{this.props.children}</View>;
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#FAF7F2" barStyle="dark-content" />
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <AlertTriangle color="#E66F49" size={28} strokeWidth={2.1} />
          </View>
          <Text style={styles.title}>页面暂时出了点问题</Text>
          <Text style={styles.body}>已保存的数据不会受影响，可以重新加载当前页面。</Text>
          <Pressable accessibilityLabel="重新加载应用" accessibilityRole="button" onPress={this.retry} style={styles.button}>
            <RefreshCw color="#FFFFFF" size={17} strokeWidth={2.4} />
            <Text style={styles.buttonText}>重新加载</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  body: { color: '#7D756D', fontSize: 14, lineHeight: 22, maxWidth: 280, textAlign: 'center' },
  button: { alignItems: 'center', backgroundColor: '#F47D57', borderRadius: 8, flexDirection: 'row', gap: 8, height: 46, justifyContent: 'center', marginTop: 26, paddingHorizontal: 24 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', lineHeight: 20 },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 48 },
  iconWrap: { alignItems: 'center', backgroundColor: '#FFF0E8', borderRadius: 8, height: 56, justifyContent: 'center', marginBottom: 20, width: 56 },
  safeArea: { backgroundColor: '#FAF7F2', flex: 1 },
  title: { color: '#28231F', fontSize: 20, fontWeight: '700', lineHeight: 28, marginBottom: 8 },
});
