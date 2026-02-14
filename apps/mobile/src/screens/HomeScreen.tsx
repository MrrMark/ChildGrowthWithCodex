import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import type { Child, GrowthPoint, PredictionResult, Sex } from "@child-growth/shared";
import {
  createCheckup,
  createChild,
  getGrowth,
  getPrediction,
  listChildren,
  parseOcrText,
  uploadOcrFile
} from "../api/client";
import { LabeledInput } from "../components/LabeledInput";
import { PrimaryButton } from "../components/PrimaryButton";
import { SectionCard } from "../components/SectionCard";
import { colors } from "../theme/colors";

export function HomeScreen() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [message, setMessage] = useState<string>("");

  const [childName, setChildName] = useState("");
  const [childBirthDate, setChildBirthDate] = useState("2023-01-01");
  const [childSex, setChildSex] = useState<Sex>("M");

  const [checkupDate, setCheckupDate] = useState("2024-01-01");
  const [heightCm, setHeightCm] = useState("90");
  const [weightKg, setWeightKg] = useState("13");
  const [headCircumferenceCm, setHeadCircumferenceCm] = useState("");
  const [notes, setNotes] = useState("");

  const [ocrText, setOcrText] = useState("");
  const [ocrFileName, setOcrFileName] = useState("");
  const [ocrExtractedPreview, setOcrExtractedPreview] = useState("");

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedChildId),
    [children, selectedChildId]
  );

  async function reloadChildren() {
    const list = await listChildren();
    setChildren(list);
    if (!selectedChildId && list.length > 0) {
      setSelectedChildId(list[0].id);
    }
  }

  async function reloadInsights(childId: string) {
    const [growthResult, predictionResult] = await Promise.all([
      getGrowth(childId),
      getPrediction(childId)
    ]);
    setGrowth(growthResult);
    setPrediction(predictionResult);
  }

  useEffect(() => {
    reloadChildren().catch((error: unknown) => {
      setMessage(String(error));
    });
  }, []);

  useEffect(() => {
    if (!selectedChildId) {
      return;
    }

    reloadInsights(selectedChildId).catch((error: unknown) => {
      setMessage(String(error));
    });
  }, [selectedChildId]);

  async function handleCreateChild() {
    try {
      const child = await createChild({
        name: childName,
        birthDate: childBirthDate,
        sex: childSex
      });
      setChildName("");
      setSelectedChildId(child.id);
      await reloadChildren();
      await reloadInsights(child.id);
      setMessage("아이를 생성했습니다.");
    } catch (error) {
      setMessage(String(error));
    }
  }

  async function handleCreateCheckup(source: "manual" | "ocr") {
    if (!selectedChildId) {
      setMessage("아이를 먼저 선택해 주세요.");
      return;
    }

    try {
      await createCheckup(selectedChildId, {
        checkupDate,
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        headCircumferenceCm: headCircumferenceCm ? Number(headCircumferenceCm) : undefined,
        notes,
        source,
        ocrRawText: source === "ocr" ? ocrText : undefined
      });
      await reloadInsights(selectedChildId);
      setMessage("검진 기록을 저장했습니다.");
    } catch (error) {
      setMessage(String(error));
    }
  }

  async function handleParseOcr() {
    if (!selectedChildId) {
      setMessage("아이를 먼저 선택해 주세요.");
      return;
    }

    try {
      const parsed = await parseOcrText(selectedChildId, ocrText);
      if (parsed.heightCm !== undefined) {
        setHeightCm(String(parsed.heightCm));
      }
      if (parsed.weightKg !== undefined) {
        setWeightKg(String(parsed.weightKg));
      }
      if (parsed.headCircumferenceCm !== undefined) {
        setHeadCircumferenceCm(String(parsed.headCircumferenceCm));
      }
      setMessage(parsed.warnings.length > 0 ? parsed.warnings.join(" ") : "OCR 추출 완료");
    } catch (error) {
      setMessage(String(error));
    }
  }

  async function handlePickAndUploadOcrFile() {
    if (!selectedChildId) {
      setMessage("아이를 먼저 선택해 주세요.");
      return;
    }

    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["text/plain", "application/pdf", "image/*"],
        copyToCacheDirectory: true,
        multiple: false
      });

      if (picked.canceled || picked.assets.length === 0) {
        return;
      }

      const asset = picked.assets[0];
      const fileType = asset.mimeType ?? "application/octet-stream";
      const result = await uploadOcrFile(selectedChildId, {
        uri: asset.uri,
        name: asset.name,
        type: fileType
      });

      setOcrFileName(asset.name);
      setOcrExtractedPreview(result.extractedTextPreview);
      if (result.parsed.heightCm !== undefined) {
        setHeightCm(String(result.parsed.heightCm));
      }
      if (result.parsed.weightKg !== undefined) {
        setWeightKg(String(result.parsed.weightKg));
      }
      if (result.parsed.headCircumferenceCm !== undefined) {
        setHeadCircumferenceCm(String(result.parsed.headCircumferenceCm));
      }
      setMessage(
        result.parsed.warnings.length > 0
          ? result.parsed.warnings.join(" ")
          : `파일 OCR 파싱 완료 (${result.extractedBy})`
      );
    } catch (error) {
      setMessage(String(error));
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>영유아 성장 기록</Text>
      <Text style={styles.subtitle}>검진 결과 누적과 예측을 한 번에 관리합니다.</Text>

      <SectionCard title="아이 생성">
        <LabeledInput label="이름" value={childName} onChangeText={setChildName} placeholder="예: 민준" />
        <LabeledInput
          label="생년월일 (YYYY-MM-DD)"
          value={childBirthDate}
          onChangeText={setChildBirthDate}
          autoCapitalize="none"
        />
        <LabeledInput label="성별 (M/F)" value={childSex} onChangeText={(v) => setChildSex(v === "F" ? "F" : "M")} />
        <PrimaryButton onPress={handleCreateChild}>아이 추가</PrimaryButton>
      </SectionCard>

      <SectionCard title="선택된 아이">
        <Text style={styles.value}>{selectedChild ? `${selectedChild.name} (${selectedChild.sex})` : "없음"}</Text>
        <View style={styles.rowWrap}>
          {children.map((child) => (
            <PrimaryButton key={child.id} onPress={() => setSelectedChildId(child.id)}>
              {child.name}
            </PrimaryButton>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="검진 기록 입력">
        <LabeledInput
          label="검진일 (YYYY-MM-DD)"
          value={checkupDate}
          onChangeText={setCheckupDate}
          autoCapitalize="none"
        />
        <LabeledInput label="키(cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" />
        <LabeledInput label="체중(kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" />
        <LabeledInput
          label="머리둘레(cm, 선택)"
          value={headCircumferenceCm}
          onChangeText={setHeadCircumferenceCm}
          keyboardType="decimal-pad"
        />
        <LabeledInput label="메모" value={notes} onChangeText={setNotes} />
        <PrimaryButton onPress={() => handleCreateCheckup("manual")}>수기 저장</PrimaryButton>
      </SectionCard>

      <SectionCard title="OCR 보정 입력">
        <PrimaryButton onPress={handlePickAndUploadOcrFile}>파일 선택 후 OCR 추출</PrimaryButton>
        {!!ocrFileName && <Text style={styles.muted}>선택 파일: {ocrFileName}</Text>}
        {!!ocrExtractedPreview && (
          <Text style={styles.muted}>추출 미리보기: {ocrExtractedPreview.slice(0, 160)}</Text>
        )}
        <LabeledInput
          label="OCR 텍스트"
          value={ocrText}
          onChangeText={setOcrText}
          multiline
          numberOfLines={4}
          placeholder="예: 키: 92.1 체중: 13.4"
        />
        <PrimaryButton onPress={handleParseOcr}>OCR 파싱</PrimaryButton>
        <PrimaryButton onPress={() => handleCreateCheckup("ocr")}>OCR 결과 저장</PrimaryButton>
      </SectionCard>

      <SectionCard title="성장률">
        {growth.length === 0 ? (
          <Text style={styles.muted}>검진 데이터가 없습니다.</Text>
        ) : (
          growth.map((point) => (
            <View key={point.checkupId} style={styles.growthItem}>
              <Text style={styles.value}>{point.checkupDate}</Text>
              <Text style={styles.muted}>키 {point.heightCm} / 체중 {point.weightKg}</Text>
              <Text style={styles.muted}>
                변화량: {point.deltaHeightCm ?? 0}cm, {point.deltaWeightKg ?? 0}kg
              </Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="예측">
        {!prediction ? (
          <Text style={styles.muted}>예측 정보가 없습니다.</Text>
        ) : prediction.status === "insufficient_data" ? (
          <Text style={styles.warning}>{prediction.reason}</Text>
        ) : (
          <>
            <Text style={styles.value}>다음 검진 예상일: {prediction.nextCheckupDate}</Text>
            <Text style={styles.muted}>
              키 예상: {prediction.heightCm?.lower} ~ {prediction.heightCm?.upper} (기대 {prediction.heightCm?.expected})
            </Text>
            <Text style={styles.muted}>
              체중 예상: {prediction.weightKg?.lower} ~ {prediction.weightKg?.upper} (기대 {prediction.weightKg?.expected})
            </Text>
          </>
        )}
      </SectionCard>

      {!!message && <Text style={styles.message}>{message}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    paddingTop: 64,
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary
  },
  subtitle: {
    color: colors.textSecondary,
    marginBottom: 8
  },
  value: {
    color: colors.textPrimary,
    fontWeight: "700"
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 13
  },
  warning: {
    color: colors.warning,
    fontWeight: "600"
  },
  growthItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 2
  },
  rowWrap: {
    gap: 8
  },
  message: {
    color: colors.textPrimary,
    fontWeight: "600"
  }
});
