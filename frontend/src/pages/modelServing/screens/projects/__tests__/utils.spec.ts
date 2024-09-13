import { mockDataConnection } from '~/__mocks__/mockDataConnection';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import {
  createNIMPVC,
  createNIMSecret,
  fetchNIMModelNames,
  filterOutConnectionsWithoutBucket,
  getCreateInferenceServiceLabels,
  getProjectModelServingPlatform,
  getUrlFromKserveInferenceService,
} from '~/pages/modelServing/screens/projects/utils';
import { LabeledDataConnection, ServingPlatformStatuses } from '~/pages/modelServing/screens/types';
import { ServingRuntimePlatform } from '~/types';
import { mockInferenceServiceK8sResource } from '~/__mocks__/mockInferenceServiceK8sResource';
import { createPvc, createSecret, getConfigMap, getSecret } from '~/api';
import { PersistentVolumeClaimKind } from '~/k8sTypes';

describe('filterOutConnectionsWithoutBucket', () => {
  it('should return an empty array if input connections array is empty', () => {
    const inputConnections: LabeledDataConnection[] = [];
    const result = filterOutConnectionsWithoutBucket(inputConnections);
    expect(result).toEqual([]);
  });

  it('should filter out connections without an AWS_S3_BUCKET property', () => {
    const dataConnections = [
      { dataConnection: mockDataConnection({ name: 'name1', s3Bucket: 'bucket1' }) },
      { dataConnection: mockDataConnection({ name: 'name2', s3Bucket: '' }) },
      { dataConnection: mockDataConnection({ name: 'name3', s3Bucket: 'bucket2' }) },
    ];

    const result = filterOutConnectionsWithoutBucket(dataConnections);

    expect(result).toMatchObject([
      {
        dataConnection: { data: { data: { Name: 'name1' } } },
      },
      {
        dataConnection: { data: { data: { Name: 'name3' } } },
      },
    ]);
  });
});

const getMockServingPlatformStatuses = ({
                                          kServeEnabled = true,
                                          kServeInstalled = true,
                                          modelMeshEnabled = true,
                                          modelMeshInstalled = true,
                                        }): ServingPlatformStatuses => ({
  kServe: {
    enabled: kServeEnabled,
    installed: kServeInstalled,
  },
  modelMesh: {
    enabled: modelMeshEnabled,
    installed: modelMeshInstalled,
  },
});

describe('getProjectModelServingPlatform', () => {
  it('should return undefined if both KServe and ModelMesh are disabled, and project has no platform label', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({ kServeEnabled: false, modelMeshEnabled: false }),
      ),
    ).toStrictEqual({});
  });
  it('should return undefined if both KServe and ModelMesh are enabled, and project has no platform label', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({}),
      ),
    ).toStrictEqual({});
  });
  it('should return Single Platform if has platform label set to false and KServe is installed', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: false }),
        getMockServingPlatformStatuses({}),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.SINGLE, error: undefined });
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: false }),
        getMockServingPlatformStatuses({ kServeEnabled: false }),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.SINGLE, error: undefined });
  });
  it('should give error if has platform label set to false and KServe is not installed', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: false }),
        getMockServingPlatformStatuses({ kServeEnabled: false, kServeInstalled: false }),
      ).error,
    ).not.toBeUndefined();
  });
  it('should return Multi Platform if has platform label set to true and ModelMesh is installed', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: true }),
        getMockServingPlatformStatuses({}),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.MULTI, error: undefined });
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: true }),
        getMockServingPlatformStatuses({ modelMeshEnabled: false }),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.MULTI, error: undefined });
  });
  it('should give error if has platform label set to true and ModelMesh is not installed', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({ enableModelMesh: true }),
        getMockServingPlatformStatuses({ modelMeshEnabled: false, modelMeshInstalled: false }),
      ).error,
    ).not.toBeUndefined();
  });
  it('should return Single Platform if only KServe is enabled, and project has no platform label', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({ modelMeshEnabled: false }),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.SINGLE });
  });
  it('should return Multi Platform if only ModelMesh is enabled, and project has no platform label', () => {
    expect(
      getProjectModelServingPlatform(
        mockProjectK8sResource({}),
        getMockServingPlatformStatuses({ kServeEnabled: false }),
      ),
    ).toStrictEqual({ platform: ServingRuntimePlatform.MULTI });
  });
});

describe('getUrlsFromKserveInferenceService', () => {
  it('should return the url from the inference service status', () => {
    const url = 'https://test-kserve.apps.kserve-pm.dev.com';
    const inferenceService = mockInferenceServiceK8sResource({
      url,
    });
    expect(getUrlFromKserveInferenceService(inferenceService)).toBe(url);
  });
  it('should return undefined if the inference service status does not have an address', () => {
    const url = '';
    const inferenceService = mockInferenceServiceK8sResource({
      url,
    });
    expect(getUrlFromKserveInferenceService(inferenceService)).toBeUndefined();
  });
  it('should return undefined if the inference service status is an internal service', () => {
    const url = 'http://test.kserve.svc.cluster.local';
    const inferenceService = mockInferenceServiceK8sResource({
      url,
    });
    expect(getUrlFromKserveInferenceService(inferenceService)).toBeUndefined();
  });
});

describe('getCreateInferenceServiceLabels', () => {
  it('returns undefined when "registeredModelId" and "modelVersionId" are undefined', () => {
    const createLabels = getCreateInferenceServiceLabels({
      registeredModelId: undefined,
      modelVersionId: undefined,
    });
    expect(createLabels).toBeUndefined();
  });

  it('returns labels with "registered-model-id" when "registeredModelId" is defined', () => {
    const createLabels = getCreateInferenceServiceLabels({
      registeredModelId: 'some-register-model-id',
      modelVersionId: undefined,
    });
    expect(createLabels).toEqual({
      labels: {
        'modelregistry.opendatahub.io/registered-model-id': 'some-register-model-id',
      },
    });
  });

  it('returns labels with "model-version-id" when "modelVersionId" is defined', () => {
    const createLabels = getCreateInferenceServiceLabels({
      registeredModelId: undefined,
      modelVersionId: 'some-model-version-id',
    });
    expect(createLabels).toEqual({
      labels: {
        'modelregistry.opendatahub.io/model-version-id': 'some-model-version-id',
      },
    });
  });

  it('returns labels with "registered-model-id" and "model-version-id" when registeredModelId and "modelVersionId" are defined', () => {
    const createLabels = getCreateInferenceServiceLabels({
      registeredModelId: 'some-register-model-id',
      modelVersionId: 'some-model-version-id',
    });
    expect(createLabels).toEqual({
      labels: {
        'modelregistry.opendatahub.io/model-version-id': 'some-model-version-id',
        'modelregistry.opendatahub.io/registered-model-id': 'some-register-model-id',
      },
    });
  });
});


jest.mock('~/api', () => ({
  getConfigMap: jest.fn().mockResolvedValueOnce({ data: {} }),
}));
describe('fetchNIMModelNames', () => {

  it('returns parsed model information if configMap has valid data', async () => {
    const dashboardNamespace = 'redhat-ods-applications';
    // Mock valid configMap data
    const configMapData = {
      name: 'Model 1',
      displayName: 'Model 1',
      shortDescription: 'This is a great model',
      namespace: 'default',
      tags: ['image-classification'],
      latestTag: 'v1.0.0',
      updatedDate: '2024-09-11T00:00:00.000Z',
    };

    // Mock the getConfigMap API call to return the mock data
    (getConfigMap as jest.Mock).mockResolvedValue({ data: configMapData });

    const expectedModelInfos = [
      {
        name: 'model1',
        displayName: 'Model 1',
        shortDescription: 'This is a great model',
        namespace: 'default',
        tags: ['image-classification'],
        latestTag: 'v1.0.0',
        updatedDate: '2024-09-11T00:00:00.000Z',
      }
    ];

    const modelInfos = await fetchNIMModelNames(dashboardNamespace);
    expect(modelInfos).toEqual(expectedModelInfos);
  });

  it('returns undefined if configMap has no data', async () => {
    (getConfigMap as jest.Mock).mockResolvedValue({ data: null });
    const result = await fetchNIMModelNames('redhat-ods-applications');
    expect(result).toBeUndefined();
  });

  it('returns undefined if getConfigMap returns undefined', async () => {
    (getConfigMap as jest.Mock).mockResolvedValue(undefined);
    const result = await fetchNIMModelNames('redhat-ods-applications');
    expect(result).toBeUndefined();
  });
});

jest.mock('~/api', () => ({
  getSecret: jest.fn(),
  createSecret: jest.fn(),
}));

describe('createNIMSecret', () => {
  const projectName = 'testProject';
  const secretName = 'testSecret';
  const dashboardNamespace = 'testNamespace';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create an NGC secret when isNGC is true', async () => {
    // Mock getSecret to return NGC secret data
    // const nimSecretData = { data: { '.dockerconfigjson': 'docker-config' } };
    // (getSecret as jest.Mock).mockResolvedValueOnce(nimSecretData);
    const resultGetSecret = await getSecret('projectName', 'secretName');

    const secretMock = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: secretName,
        namespace: projectName,
        // labels,
      },
      data: {'.dockerconfigjson': 'docker-config' },
      type: 'kubernetes.io/dockerconfigjson',
    };

    expect(resultGetSecret).toStrictEqual(secretMock);
    //
    // // Mock createSecret
    // (createSecret as jest.Mock).mockResolvedValueOnce({ metadata: { name: secretName } });
    //
    // const result = await createNIMSecret(projectName, secretName, true, false, dashboardNamespace);
    //
    // // Ensure getSecret is called with the correct NGC secret name
    // expect(getSecret).toHaveBeenCalledWith(dashboardNamespace, 'nim-ngc-secret');
    // expect(createSecret).toHaveBeenCalledWith(
    //   expect.objectContaining({
    //     data: { '.dockerconfigjson': 'docker-config' },
    //     metadata: { name: secretName, namespace: projectName },
    //     type: 'kubernetes.io/dockerconfigjson',
    //   }),
    //   { dryRun: false },
    // );
    // expect(result).toEqual({ metadata: { name: secretName } });
  });

  it('should create a regular secret when isNGC is false', async () => {
    // Mock getSecret to return regular secret data
    const nimSecretData = { data: { api_key: 'test-api-key' } };
    (getSecret as jest.Mock).mockResolvedValueOnce(nimSecretData);

    // Mock createSecret
    (createSecret as jest.Mock).mockResolvedValueOnce({ metadata: { name: secretName } });

    const result = await createNIMSecret(projectName, secretName, false, false, dashboardNamespace);

    // Ensure getSecret is called with the correct regular secret name
    expect(getSecret).toHaveBeenCalledWith(dashboardNamespace, 'nim-secret');
    expect(createSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { NGC_API_KEY: 'test-api-key' },
        metadata: { name: secretName, namespace: projectName },
        type: 'Opaque',
      }),
      { dryRun: false },
    );
    expect(result).toEqual({ metadata: { name: secretName } });
  });

  it('should reject if nimSecretData.data is not present', async () => {
    // Mock getSecret to return null data
    const nimSecretData = { data: null };
    (getSecret as jest.Mock).mockResolvedValueOnce(nimSecretData);

    await expect(createNIMSecret(projectName, secretName, true, false, dashboardNamespace))
      .rejects
      .toThrow('Error creating NIM NGC secret');

    await expect(createNIMSecret(projectName, secretName, false, false, dashboardNamespace))
      .rejects
      .toThrow('Error creating NIM secret');
  });

  it('should reject if getSecret fails', async () => {
    // Mock getSecret to throw an error
    (getSecret as jest.Mock).mockRejectedValueOnce(new Error('Secret not found'));

    await expect(createNIMSecret(projectName, secretName, true, false, dashboardNamespace))
      .rejects
      .toThrow('Secret not found');

    await expect(createNIMSecret(projectName, secretName, false, false, dashboardNamespace))
      .rejects
      .toThrow('Secret not found');
  });
});

// describe('createNIMSecret', () => {
//   const projectName = 'test-project';
//   const secretName = 'test-secret';
//   const dashboardNamespace = 'test-namespace';
//
//   it('should create a Docker config secret if isNGC is true and nimSecretData contains .dockerconfigjson', async () => {
//     const nimSecretData = {
//       data: {
//         '.dockerconfigjson': 'docker-config-data',
//       },
//     };
//
//     (getSecret as jest.Mock).mockResolvedValue(nimSecretData);
//
//     const newSecret = {
//       apiVersion: 'v1',
//       kind: 'Secret',
//       metadata: {
//         name: secretName,
//         namespace: projectName,
//         // labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
//       },
//       data: { '.dockerconfigjson': 'docker-config-data' },
//       type: 'kubernetes.io/dockerconfigjson',
//     };
//
//     const result = await createNIMSecret(projectName, secretName, true, false, dashboardNamespace);
//
//     expect(result).toEqual(newSecret);
//     expect(getSecret).toHaveBeenCalledWith(dashboardNamespace, 'nvidia-nim-image-pull');
//     expect(createSecret).toHaveBeenCalledWith(newSecret, { dryRun: false });
//   });
//
//   it('should create an Opaque secret with NGC_API_KEY if isNGC is false and nimSecretData contains api_key', async () => {
//     const nimSecretData = {
//       data: {
//         api_key: 'api-key-data',
//       },
//     };
//
//     // Mock the getSecret function to return the mock nimSecretData
//     (getSecret as jest.Mock).mockResolvedValueOnce(nimSecretData);
//
//     const newSecret = {
//       apiVersion: 'v1',
//       kind: 'Secret',
//       metadata: {
//         name: secretName,
//         namespace: projectName,
//         // labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
//       },
//       data: { NGC_API_KEY: 'api-key-data' },
//       type: 'Opaque',
//     };
//
//     (createSecret as jest.Mock).mockResolvedValueOnce(newSecret);
//
//     const result = await createNIMSecret(projectName, secretName, false, false, dashboardNamespace);
//
//     expect(result).toEqual(newSecret);
//     expect(getSecret).toHaveBeenCalledWith(dashboardNamespace, 'nvidia-nim-access');
//     expect(createSecret).toHaveBeenCalledWith(newSecret, { dryRun: false });
//   });
//
//   it('should reject if nimSecretData.data is not present', async () => {
//     (getSecret as jest.Mock).mockRejectedValueOnce({ data: null });
//
//     await expect(createNIMSecret(projectName, secretName, true, false, dashboardNamespace))
//       .rejects
//       .toThrow('Error creating NIM NGC secret');
//
//     await expect(createNIMSecret(projectName, secretName, false, false, dashboardNamespace))
//       .rejects
//       .toThrow('Error creating NIM secret');
//   });
//
//   it('should handle dryRun option correctly', async () => {
//     const nimSecretData = {
//       data: {
//         '.dockerconfigjson': 'docker-config-data',
//       },
//     };
//     (getSecret as jest.Mock).mockResolvedValueOnce(nimSecretData);
//     const newSecret = {
//       apiVersion: 'v1',
//       kind: 'Secret',
//       metadata: {
//         name: secretName,
//         namespace: projectName,
//         // labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
//       },
//       data: { '.dockerconfigjson': 'docker-config-data' },
//       type: 'kubernetes.io/dockerconfigjson',
//     };
//     (createSecret as jest.Mock).mockResolvedValueOnce(newSecret);
//     const result = await createNIMSecret(projectName, secretName, true, true, dashboardNamespace);
//     expect(result).toEqual(newSecret);
//     expect(getSecret).toHaveBeenCalledWith(dashboardNamespace, 'nvidia-nim-image-pull');
//     expect(createSecret).toHaveBeenCalledWith(newSecret, { dryRun: true });
//   });
// });


// describe('createNIMSecret', () => {
//   it('should create a secret with NGC API key for non-NGC projects', async () => {
//     const projectName = 'my-project';
//     const secretName = 'my-secret';
//     const dashboardNamespace = 'my-dashboard';
//     const nimSecretData = {
//       data: {
//         api_key: 'some-api-key',
//       },
//     };
//     const expectedSecret: SecretKind = {
//       apiVersion: 'v1',
//       kind: 'Secret',
//       metadata: {
//         name: secretName,
//         namespace: projectName,
//       },
//       data: {
//         NGC_API_KEY: nimSecretData.data.api_key,
//       },
//       type: 'Opaque',
//     };
//
//     (getSecret as jest.Mock).mockResolvedValueOnce(nimSecretData);
//     (createSecret as jest.Mock).mockResolvedValueOnce(expectedSecret);
//
//     const createdSecret = await createNIMSecret(projectName, secretName, false, false, dashboardNamespace);
//
//     expect(createdSecret).toEqual(expectedSecret);
//     expect(getSecret).toHaveBeenCalledWith(dashboardNamespace, 'nvidia-nim-access');
//     expect(createSecret).toHaveBeenCalledWith(expectedSecret, { dryRun: false });
//   });
//
//   it('should create a secret with dockerconfigjson for NGC projects', async () => {
//     const projectName = 'my-project';
//     const secretName = 'my-secret';
//     const dashboardNamespace = 'my-dashboard';
//     const nimSecretData = {
//       data: {
//         '.dockerconfigjson': 'some-docker-config',
//       },
//     };
//     const expectedSecret: SecretKind = {
//       apiVersion: 'v1',
//       kind: 'Secret',
//       metadata: {
//         name: secretName,
//         namespace: projectName,
//       },
//       data: {
//         '.dockerconfigjson': nimSecretData.data['.dockerconfigjson'],
//       },
//       type: 'kubernetes.io/dockerconfigjson',
//     };
//
//     (getSecret as jest.Mock).mockResolvedValueOnce(nimSecretData);
//     (createSecret as jest.Mock).mockResolvedValueOnce(expectedSecret);
//
//     const createdSecret = await createNIMSecret(projectName, secretName, true, false, dashboardNamespace);
//
//     expect(createdSecret).toEqual(expectedSecret);
//     expect(getSecret).toHaveBeenCalledWith(dashboardNamespace, 'nvidia-nim-image-pull');
//     expect(createSecret).toHaveBeenCalledWith(expectedSecret, { dryRun: false });
//   });
//
//   it('should reject if there is no data in the retrieved secret', async () => {
//     const projectName = 'my-project';
//     const secretName = 'my-secret';
//     const dashboardNamespace = 'my-dashboard';
//     const nimSecretData = { data: {} };
//
//     (getSecret as jest.Mock).mockResolvedValueOnce(nimSecretData);
//
//     await expect(createNIMSecret(projectName, secretName, true, false, dashboardNamespace)).rejects.toThrowError(
//       'Error creating NIM NGC secret'
//     );
//   });
// });
jest.mock('~/api', () => ({
  createPvc: jest.fn(),
}));
describe('createNIMPVC', () => {
  const projectName = 'test-project';
  const pvcName = 'test-pvc';
  const pvcSize = '10Gi';

  it('should create a PVC with the given name and size', async () => {
    const mockPvc: PersistentVolumeClaimKind = {
      metadata: {
        name: pvcName,
        namespace: projectName,
      },
      spec: {
        resources: {
          requests: {
            storage: pvcSize,
          },
        },
      },
    };

    (createPvc as jest.Mock).mockResolvedValueOnce(mockPvc);
    const result = await createNIMPVC(projectName, pvcName, pvcSize, false);
    expect(createPvc).toHaveBeenCalledWith(
      {
        nameDesc: {
          name: pvcName,
          description: '',
        },
        size: pvcSize,
      },
      projectName,
      undefined,
      { dryRun: false },
    );
    expect(result).toEqual(mockPvc);
  });

  it('should handle the dryRun option correctly', async () => {
    const mockPvc: PersistentVolumeClaimKind = {
      metadata: {
        name: pvcName,
        namespace: projectName,
      },
      spec: {
        resources: {
          requests: {
            storage: pvcSize,
          },
        },
      },
    };

    (createPvc as jest.Mock).mockResolvedValueOnce(mockPvc);
    const result = await createNIMPVC(projectName, pvcName, pvcSize, true);
    expect(createPvc).toHaveBeenCalledWith(
      {
        nameDesc: {
          name: pvcName,
          description: '',
        },
        size: pvcSize,
      },
      projectName,
      undefined,
      { dryRun: true },
    );
    expect(result).toEqual(mockPvc);
  });

  it('should handle errors from createPvc', async () => {
    const errorMessage = 'Failed to create PVC';
    (createPvc as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));
    await expect(createNIMPVC(projectName, pvcName, pvcSize, false)).rejects.toThrow(
      errorMessage,
    );
  });
});
