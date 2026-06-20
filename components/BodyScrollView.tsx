import { forwardRef } from "react";
import { ScrollView, ScrollViewProps } from "react-native";

export const BodyScrollView = forwardRef<any, ScrollViewProps>((props, ref) => {
  const safeProps = Object.fromEntries(
    Object.entries(props as Record<string, unknown>).filter(([k]) => !k.startsWith('__'))
  ) as ScrollViewProps;
  return (
    <ScrollView
      automaticallyAdjustsScrollIndicatorInsets
      contentInsetAdjustmentBehavior="automatic"
      contentInset={{ bottom: 0 }}
      scrollIndicatorInsets={{ bottom: 0 }}
      {...safeProps}
      ref={ref}
    />
  );
});
