import React from 'react';
import { InferenceServiceKind, PersistentVolumeClaimKind, ServingRuntimeKind } from '~/k8sTypes';
import { getPvc } from '~/api';
import { CreatingStorageObject } from '~/pages/projects/types';

type PVCSizeState = {
  pvcSize: string;
  setPvcSize: React.Dispatch<React.SetStateAction<string>>;
  existingPvcSize: string | null;
  existingPVC: PersistentVolumeClaimKind | undefined;
  createData: CreatingStorageObject | undefined;
};

export const usePVCSize = (
  namespace: string | undefined,
  inferenceServiceEditInfo?: InferenceServiceKind,
  servingRuntimeEditInfo?: ServingRuntimeKind,
): PVCSizeState => {
  const [existingPvcSize, setExistingPvcSize] = React.useState<string | null>(null);
  const [pvcSize, setPvcSize] = React.useState<string>('30Gi');
  const [existingPVC, setExistingPVC] = React.useState<PersistentVolumeClaimKind | undefined>();
  const defaultCreateData: CreatingStorageObject = {
    size: '30Gi',
    nameDesc: {
      name: '',
      description: '',
    },
    storageClassName: '',
  };
  const [createData, setCreateData] = React.useState<CreatingStorageObject>(defaultCreateData);

  React.useEffect(() => {
    const fetchPVCSize = async () => {
      if (inferenceServiceEditInfo?.metadata.namespace && servingRuntimeEditInfo) {
        const pvcName = servingRuntimeEditInfo.spec.volumes?.find(
          (vol) => vol.persistentVolumeClaim?.claimName,
        )?.persistentVolumeClaim?.claimName;
        if (!pvcName) {
          return;
        }
        const pvcData = await getPvc(inferenceServiceEditInfo.metadata.namespace, pvcName);
        setExistingPVC(pvcData);
        const size = pvcData.spec.resources.requests.storage;
        if (size) {
          setExistingPvcSize(size);
          setPvcSize(size);
        }

        setCreateData({
          size: size || '30Gi',
          nameDesc: {
            name: pvcData.metadata.name,
            description: pvcData.metadata.annotations?.description || '',
          },
          storageClassName: pvcData.spec.storageClassName,
        });
      }
    };

    fetchPVCSize();
  }, [namespace, inferenceServiceEditInfo, servingRuntimeEditInfo]);

  return { pvcSize, setPvcSize, existingPvcSize, existingPVC, createData };
};
