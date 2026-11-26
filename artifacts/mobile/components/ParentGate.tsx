import React, { useCallback, useRef, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";

import { Body, Button, Card, H2, TextField } from "@/components/primitives";
import { useColors } from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";

// Parent gate (Google Play Families Policy / Apple Kids guidance): a question
// a young child can't easily answer, shown before anything that leaves the app.
// Usage:
//   const { gate, guard } = useParentGate();
//   <Button onPress={() => guard(() => openTerms())} />
//   {gate}
function newQuestion() {
  const a = 6 + Math.floor(Math.random() * 4); // 6..9
  const b = 6 + Math.floor(Math.random() * 4);
  return { a, b, answer: a * b };
}

export function useParentGate() {
  const colors = useColors();
  const [visible, setVisible] = useState(false);
  const [question, setQuestion] = useState(newQuestion);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<(() => void) | null>(null);

  const guard = useCallback((action: () => void) => {
    pending.current = action;
    setQuestion(newQuestion());
    setInput("");
    setError(null);
    setVisible(true);
  }, []);

  const close = () => {
    pending.current = null;
    setVisible(false);
  };

  const submit = () => {
    if (Number(input.trim()) === question.answer) {
      const action = pending.current;
      close();
      action?.();
      return;
    }
    setError("That's not right. Ask a parent to help.");
    setQuestion(newQuestion());
    setInput("");
  };

  const gate = (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <Card variant="elevated" style={styles.card}>
          <H2 style={{ textAlign: "center", marginBottom: 0 }}>Grown-ups only</H2>
          <Body color={colors.mutedForeground} style={{ textAlign: "center" }}>
            To continue, please answer: what is {question.a} × {question.b}?
          </Body>
          <TextField
            value={input}
            onChangeText={setInput}
            keyboardType="number-pad"
            placeholder="Answer"
            maxLength={3}
            autoFocus
            accessibilityLabel={`What is ${question.a} times ${question.b}?`}
          />
          {error && <Body color={colors.destructive} style={{ textAlign: "center" }}>{error}</Body>}
          <View style={styles.buttons}>
            <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={close} />
            <Button title="Continue" style={{ flex: 1 }} onPress={submit} />
          </View>
        </Card>
      </View>
    </Modal>
  );

  return { gate, guard };
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: { width: "100%", maxWidth: 340, gap: spacing.md },
  buttons: { flexDirection: "row", gap: spacing.md },
});
