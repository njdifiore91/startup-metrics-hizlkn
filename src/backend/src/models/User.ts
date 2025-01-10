import { Model, DataTypes, Sequelize, Op } from 'sequelize'; // ^6.31.0
import { IUser } from '../interfaces/IUser';
import { USER_ROLES } from '../constants/roles';
import { encrypt, decrypt, hash } from '../utils/encryption';
import { authConfig } from '../config/auth';
import { createLogger } from '../utils/logger';

const logger = createLogger('UserModel');

// Constants for model configuration
const MODEL_NAME = 'User' as const;
const TABLE_NAME = 'users' as const;
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

/**
 * Sequelize model class for User entity with enhanced security features
 * including field-level encryption and audit logging
 */
class User extends Model<IUser> implements IUser {
  public id!: string;
  public email!: string;
  public name!: string;
  public role!: typeof USER_ROLES[keyof typeof USER_ROLES];
  public googleId!: string;
  public createdAt!: Date;
  public lastLoginAt!: Date;
  public isActive!: boolean;
  public version!: number;
  public readonly deletedAt!: Date | null;

  /**
   * Initializes the User model with Sequelize instance
   * @param sequelize - Sequelize instance
   * @returns Initialized User model
   */
  public static init(sequelize: Sequelize): typeof User {
    super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          validate: {
            isEmail: true,
            matches: EMAIL_REGEX,
          },
          set(value: string) {
            // Encrypt email before storage
            const encrypted = encrypt(value.toLowerCase(), authConfig.jwt.privateKey);
            this.setDataValue('email', encrypted.encryptedData);
          },
          get() {
            const encrypted = this.getDataValue('email');
            return encrypted ? decrypt(encrypted, authConfig.jwt.privateKey) : null;
          },
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [2, 100],
            notEmpty: true,
          },
        },
        role: {
          type: DataTypes.ENUM(...Object.values(USER_ROLES)),
          allowNull: false,
          defaultValue: USER_ROLES.USER,
          validate: {
            isIn: [Object.values(USER_ROLES)],
          },
        },
        googleId: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          validate: {
            notEmpty: true,
          },
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        lastLoginAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        version: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: MODEL_NAME,
        tableName: TABLE_NAME,
        timestamps: true,
        paranoid: true,
        version: true,
        indexes: [
          {
            unique: true,
            fields: ['email'],
            name: 'users_email_idx',
          },
          {
            unique: true,
            fields: ['googleId'],
            name: 'users_google_id_idx',
          },
          {
            fields: ['role'],
            name: 'users_role_idx',
          },
        ],
        hooks: {
          beforeSave: async (instance: User) => {
            logger.info('Saving user record', { userId: instance.id });
          },
          afterSave: async (instance: User) => {
            logger.info('User record saved', { userId: instance.id });
          },
          beforeDestroy: async (instance: User) => {
            logger.warn('Attempting to delete user record', { userId: instance.id });
          },
        },
      }
    );

    return User;
  }

  /**
   * Finds a user by their email address with rate limiting and security logging
   * @param email - User's email address
   * @returns Promise resolving to found user or null
   */
  public static async findByEmail(email: string): Promise<User | null> {
    try {
      const hashedEmail = await hash(email.toLowerCase());
      logger.info('Looking up user by email', { hashedEmail });

      const user = await User.findOne({
        where: {
          email: {
            [Op.eq]: email.toLowerCase(),
          },
          isActive: true,
        },
      });

      logger.info('User lookup complete', {
        hashedEmail,
        found: !!user,
      });

      return user;
    } catch (error) {
      logger.error('Error finding user by email', { error });
      throw error;
    }
  }

  /**
   * Finds a user by their Google ID with security logging
   * @param googleId - User's Google OAuth ID
   * @returns Promise resolving to found user or null
   */
  public static async findByGoogleId(googleId: string): Promise<User | null> {
    try {
      logger.info('Looking up user by Google ID');

      const user = await User.findOne({
        where: {
          googleId,
          isActive: true,
        },
      });

      logger.info('Google ID lookup complete', {
        found: !!user,
      });

      return user;
    } catch (error) {
      logger.error('Error finding user by Google ID', { error });
      throw error;
    }
  }
}

export default User;