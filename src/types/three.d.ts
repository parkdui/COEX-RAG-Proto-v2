import { ThreeElements } from '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      ambientLight: ThreeElements['ambientLight'];
      directionalLight: ThreeElements['directionalLight'];
      mesh: ThreeElements['mesh'];
      group: ThreeElements['group'];
    }
  }
}





