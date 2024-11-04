import React from 'react';
import { InferenceServiceKind, PersistentVolumeClaimKind, ServingRuntimeKind } from '~/k8sTypes';
import { getPVC } from '~/pages/modelServing/screens/projects/utils';

type PVCSizeState = {
  pvcSize: string;
  setPvcSize: React.Dispatch<React.SetStateAction<string>>;
  existingPvcSize: string | null;
  existingPVC: PersistentVolumeClaimKind | undefined;
};

export const usePVCSize = (
  namespace: string | undefined,
  inferenceServiceEditInfo?: InferenceServiceKind,
  servingRuntimeEditInfo?: ServingRuntimeKind,
): PVCSizeState => {
  const [existingPvcSize, setExistingPvcSize] = React.useState<string | null>(null);
  const [pvcSize, setPvcSize] = React.useState<string>('30Gi');
  const [existingPVC, setExistingPVC] = React.useState<PersistentVolumeClaimKind | undefined>();

  React.useEffect(() => {
    const fetchPVCSize = async () => {
      if (inferenceServiceEditInfo?.metadata.namespace) {
        const pvcData = await getPVC(
          inferenceServiceEditInfo.metadata.namespace,
          servingRuntimeEditInfo,
        );
        if (pvcData) {
          setExistingPVC(pvcData);
          const size = pvcData.spec.resources.requests.storage;
          if (size) {
            setExistingPvcSize(size);
            setPvcSize(size);
          }
        }
      }
    };

    fetchPVCSize();
  }, [namespace, inferenceServiceEditInfo, servingRuntimeEditInfo]);

  return { pvcSize, setPvcSize, existingPvcSize, existingPVC };
};
