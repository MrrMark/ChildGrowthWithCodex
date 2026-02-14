import type { TextInputProps } from "react-native";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../theme/colors";

interface LabeledInputProps extends TextInputProps {
  label: string;
}

export function LabeledInput({ label, ...props }: LabeledInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600"
  },
  input: {
    backgroundColor: "#f7f9ff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.textPrimary
  }
});
