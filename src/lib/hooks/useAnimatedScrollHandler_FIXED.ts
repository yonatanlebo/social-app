// Be warned. This Hook is very buggy unless used in a very constrained way.
// To use it safely:
//
// - DO NOT pass its return value as a prop to any user-defined component.
// - DO NOT pass its return value to more than a single component.
//
// In other words, the only safe way to use it is next to the leaf Reanimated View.
//
// Relevant bug reports:
// - http://192.168.0.49:8085/repository/github/software-mansion/react-native-reanimated/issues/5345
// - http://192.168.0.49:8085/repository/github/software-mansion/react-native-reanimated/issues/5360
// - http://192.168.0.49:8085/repository/github/software-mansion/react-native-reanimated/issues/5364
//
// It's great when it works though.
export {useAnimatedScrollHandler} from 'react-native-reanimated'
