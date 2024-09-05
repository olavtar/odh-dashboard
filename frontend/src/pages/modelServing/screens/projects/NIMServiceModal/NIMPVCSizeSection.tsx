import React, { useState } from 'react';
import { FormGroup, HelperText, HelperTextItem, TextInput } from '@patternfly/react-core';

interface PVCSizeSectionProps {
  pvcSize: string;
  setPvcSize: (value: string) => void;
}

const PVCSizeSection: React.FC<PVCSizeSectionProps> = ({ pvcSize, setPvcSize }) => {
  const [error, setError] = useState<string>('');

  const handlePVCSizeChange = (value: string) => {
    let errorMessage = '';
    if (value.length === 0) {
      errorMessage = 'PVC Size is required';
    } else if (!/^\d+(Gi|Mi|Ti)$/.test(value)) {
      errorMessage = 'Invalid format. Use numbers followed by Gi, Mi, or Ti (e.g., 10Gi)';
    }
    setError(errorMessage);
    setPvcSize(value);
  };

  return (
    <FormGroup label="NVIDIA NIM storage size " isRequired>
      <TextInput
        isRequired
        id="pvc-size"
        value={pvcSize}
        validated={error ? 'error' : 'default'}
        onChange={(_event, value) => handlePVCSizeChange(value)}
        placeholder="e.g., 10Gi"
        aria-label="pvc-size-input"
      />
      <HelperText>
        <HelperTextItem>
          Specify the size of the cluster storage instance that will be created to store the
          downloaded NVIDIA NIM.
        </HelperTextItem>
      </HelperText>
      {error && (
        <HelperText>
          <HelperTextItem variant="error">{error}</HelperTextItem>
        </HelperText>
      )}
    </FormGroup>
  );
};

export default PVCSizeSection;
