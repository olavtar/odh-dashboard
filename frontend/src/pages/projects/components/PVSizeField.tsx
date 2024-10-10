import * as React from 'react';
import { FormGroup, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import ValueUnitField from '~/components/ValueUnitField';
import { MEMORY_UNITS_FOR_SELECTION, UnitOption } from '~/utilities/valueUnits';

type PVSizeFieldProps = {
  fieldID: string;
  size: string;
  menuAppendTo?: HTMLElement;
  setSize: (size: string) => void;
  currentSize?: string;
  label?: string;
  options?: UnitOption[];
};

const PVSizeField: React.FC<PVSizeFieldProps> = ({
  fieldID,
  size,
  menuAppendTo,
  setSize,
  currentSize,
  label = 'Persistent storage size',
  options = MEMORY_UNITS_FOR_SELECTION,
}) => (
  <FormGroup label={label} fieldId={fieldID} data-testid={fieldID}>
    <ValueUnitField
      min={currentSize ?? 1}
      onBlur={(value) => setSize(value)}
      menuAppendTo={menuAppendTo}
      onChange={(value) => setSize(value)}
      validated={currentSize ? 'warning' : 'default'}
      options={options}
      value={size}
    />
    {currentSize && (
      <FormHelperText>
        <HelperText>
          <HelperTextItem
            data-testid="persistent-storage-warning"
            variant="warning"
            icon={<ExclamationTriangleIcon />}
          >
            Storage size can only be increased. If you do so, the workbench will restart and be
            unavailable for a period of time that is usually proportional to the size change.
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    )}
  </FormGroup>
);

export default PVSizeField;
