import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';

interface InputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

const InputBar: React.FC<InputBarProps> = ({
  value,
  onChangeText,
  onSubmit,
  placeholder = '比如：想吃火锅再去看展，预算 300，不排队',
}) => {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(128, 128, 128, 0.6)"
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        keyboardType="default"
        autoFocus={false}
        clearButtonMode="while-editing"
        autoComplete="off"
        autoCorrect={false}
        autoCapitalize="none"
        textContentType="none"
      />
      <TouchableOpacity style={styles.micButton} onPress={() => {}}>
        <Text style={styles.micIcon}>🎤</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 12,
    fontFamily: 'System',
    textAlignVertical: 'center',
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  micIcon: {
    fontSize: 16,
  },
});

export default InputBar;
