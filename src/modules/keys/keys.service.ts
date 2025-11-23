import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BootstrapKeysDto } from './dto/bootstrap-keys.dto';

@Injectable()
export class KeysService {
  constructor(private prisma: PrismaService) {}

  async bootstrapKeys(userId: string, bootstrapData: BootstrapKeysDto) {
    console.log('🚀 Starting key bootstrap process for user:', userId);
    console.log('📱 Device ID:', bootstrapData.deviceId);
    console.log('🔑 OPK count:', bootstrapData.oneTimePreKeys.length);

    // Validate OPK count
    if (bootstrapData.oneTimePreKeys.length > 1000) {
      console.log('❌ OPK count exceeds limit:', bootstrapData.oneTimePreKeys.length);
      throw new BadRequestException('Too many one-time prekeys (max: 1000)');
    }

    // Check for existing device
    const existingDevice = await this.prisma.device.findUnique({
      where: { device_id: bootstrapData.deviceId },
    });

    if (existingDevice) {
      console.log('❌ Device already exists:', bootstrapData.deviceId);
      throw new BadRequestException('Device already exists');
    }

    console.log('✅ Device validation passed, creating new device...');

    // Create device with transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const device = await tx.device.create({
        data: {
          user_id: userId,
          device_id: bootstrapData.deviceId,
          device_name: bootstrapData.deviceName,
          device_type: bootstrapData.deviceType,
          identity_pub_key: bootstrapData.identity.ed25519Public,
          identity_algo: 'ed25519',
        },
      });

      console.log('✅ Device created with ID:', device.id);

      const signedPrekey = await tx.signedPrekey.create({
        data: {
          device_id: device.id,
          key_id: bootstrapData.signedPreKey.keyId,
          public_key: bootstrapData.signedPreKey.x25519Public,
          signature: bootstrapData.signedPreKey.signatureEd25519,
          valid_from: new Date(),
          valid_until: new Date(bootstrapData.signedPreKey.validUntil),
          is_current: true,
        },
      });

      console.log('✅ Signed prekey created with ID:', signedPrekey.id);

      const oneTimePrekeys = await tx.oneTimePrekey.createMany({
        data: bootstrapData.oneTimePreKeys.map(opk => ({
          device_id: device.id,
          key_id: opk.keyId,
          public_key: opk.x25519Public,
        })),
      });

      console.log('✅ One-time prekeys created:', oneTimePrekeys.count);

      return { device, signedPrekey, oneTimePrekeys };
    });

    console.log('🎉 Key bootstrap completed successfully');
    
    return {
      status: 'success',
      data: {
        accepted: true,
        opkInserted: result.oneTimePrekeys.count,
        deviceId: result.device.id,
        message: 'Keys bootstrapped successfully'
      }
    };
  }

  async getKeysStatus(userId: string) {
    console.log('📊 Fetching keys status for user:', userId);

    const device = await this.prisma.device.findFirst({
      where: { user_id: userId },
      include: {
        signedPrekeys: {
          where: { is_current: true },
          take: 1,
        },
        oneTimePrekeys: {
          where: { used: false },
        },
      },
    });

    if (!device) {
      console.log('❌ Device not found for user:', userId);
      throw new NotFoundException('Device not found for this user');
    }

    const status = {
      opkRemaining: device.oneTimePrekeys.length,
      spkValidUntil: device.signedPrekeys[0]?.valid_until || null,
      deviceId: device.device_id,
      deviceName: device.device_name,
    };

    console.log('✅ Keys status retrieved:', status);
    
    return {
      status: 'success',
      data: status
    };
  }

  async validateKeyBundle(bootstrapData: BootstrapKeysDto) {
    console.log('🔍 DEBUG - Validating key bundle:');
    console.log('   Identity Public:', bootstrapData.identity.ed25519Public?.substring(0, 20) + '...');
    console.log('   Signed Prekey Public:', bootstrapData.signedPreKey.x25519Public?.substring(0, 20) + '...');
    console.log('   Signed Prekey Signature:', bootstrapData.signedPreKey.signatureEd25519?.substring(0, 20) + '...');
    console.log('   OPK count:', bootstrapData.oneTimePreKeys.length);
    
    const allKeyIds = [
      bootstrapData.signedPreKey.keyId,
      ...bootstrapData.oneTimePreKeys.map(opk => opk.keyId),
    ];

    const uniqueKeyIds = new Set(allKeyIds);
    if (uniqueKeyIds.size !== allKeyIds.length) {
      throw new BadRequestException('All key IDs must be unique');
    }

    try {
      console.log('🔍 DEBUG - Testing base64 decoding...');
      const identityPubKey = Buffer.from(bootstrapData.identity.ed25519Public, 'base64');
      console.log('   Identity key length:', identityPubKey.length);
      if (identityPubKey.length !== 32) {
        throw new BadRequestException('Invalid Ed25519 public key length');
      }

      const spkPubKey = Buffer.from(bootstrapData.signedPreKey.x25519Public, 'base64');
      if (spkPubKey.length !== 32) {
        throw new BadRequestException('Invalid X25519 public key length');
      }

      for (const opk of bootstrapData.oneTimePreKeys) {
        const opkPubKey = Buffer.from(opk.x25519Public, 'base64');
        if (opkPubKey.length !== 32) {
          throw new BadRequestException('Invalid X25519 public key length');
        }
      }

      const signature = Buffer.from(bootstrapData.signedPreKey.signatureEd25519, 'base64');
      console.log('🔍 DEBUG - Signature validation:');
      console.log('   Signature base64:', bootstrapData.signedPreKey.signatureEd25519?.substring(0, 20) + '...');
      console.log('   Signature length:', signature.length, 'bytes');
      console.log('   Expected length: 64 bytes');
      if (signature.length !== 64) {
        throw new BadRequestException('Invalid Ed25519 signature length');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid base64 encoding');
    }

    return true;
  }

  /**
   * Get key bundle for initiating X3DH session with a user
   * Returns public keys (Identity, SignedPreKey, OneTimePreKey) for each device
   */
  async getKeyBundle(userId: string, deviceId?: string, nickname?: string) {
    console.log('🔑 Fetching key bundle for user:', userId || '(from nickname)', 'device:', deviceId || 'all');

    // If nickname provided, resolve to userId first
    if (!userId && nickname) {
      const user = await this.prisma.user.findUnique({
        where: { nickname },
        select: { id: true },
      });
      if (!user) {
        throw new NotFoundException('User not found for given nickname');
      }
      userId = user.id;
    }

    if (!userId) {
      throw new BadRequestException('userId or nickname is required');
    }

    // Get devices
    const devices = await this.prisma.device.findMany({
      where: {
        user_id: userId,
        ...(deviceId && { device_id: deviceId }),
      },
      include: {
        signedPrekeys: {
          where: { is_current: true },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    if (devices.length === 0) {
      throw new NotFoundException('No devices found for user');
    }

    console.log('📱 Found', devices.length, 'device(s)');

    // Build bundle for each device
    const bundles = await Promise.all(
      devices.map(async (device) => {
        // Get current signed prekey
        const signedPrekey = device.signedPrekeys[0];
        if (!signedPrekey) {
          console.log('⚠️ No signed prekey for device:', device.device_id);
          return null;
        }

        // Atomically select and mark one OPK as used
        let oneTimePrekey: { key_id: string; public_key: string } | null = null;
        try {
          const result = await this.prisma.$transaction(async (tx) => {
            // Select one unused OPK (with row lock)
            const opk = await tx.oneTimePrekey.findFirst({
              where: {
                device_id: device.id,
                used: false,
              },
              orderBy: { created_at: 'asc' },
            });

            if (!opk) {
              console.log('⚠️ No unused OPK for device:', device.device_id);
              return null;
            }

            // Mark as used
            await tx.oneTimePrekey.update({
              where: { id: opk.id },
              data: {
                used: true,
                consumed_at: new Date(),
              },
            });

            console.log('✅ Consumed OPK:', opk.key_id, 'for device:', device.device_id);
            return { key_id: opk.key_id, public_key: opk.public_key };
          });
          oneTimePrekey = result;
        } catch (error) {
          console.error('❌ Error consuming OPK:', error);
          // Continue without OPK (X3DH allows this)
        }

        return {
          deviceId: device.device_id,
          identityEd25519Public: device.identity_pub_key,
          signedPreKey: {
            keyId: signedPrekey.key_id,
            x25519Public: signedPrekey.public_key,
            signatureEd25519: signedPrekey.signature,
            validUntil: signedPrekey.valid_until,
          },
          oneTimePreKey: oneTimePrekey
            ? {
                keyId: oneTimePrekey.key_id,
                x25519Public: oneTimePrekey.public_key,
              }
            : null,
        };
      }),
    );

    // Filter out devices without valid bundles
    const validBundles = bundles.filter((b) => b !== null);

    if (validBundles.length === 0) {
      throw new NotFoundException('No valid key bundles found');
    }

    console.log('✅ Returning', validBundles.length, 'valid bundle(s)');
    return validBundles;
  }
}
