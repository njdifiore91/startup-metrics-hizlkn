import { QueryInterface, DataTypes } from 'sequelize';

const TABLE_NAME = 'users';

interface TableIndex {
  name: string;
  fields: string[];
  unique: boolean;
}

/** @type {import('sequelize').Migration} */
module.exports = {
  async up(queryInterface: QueryInterface) {
    const columns = await queryInterface.describeTable(TABLE_NAME);

    // Add setupCompleted if it doesn't exist
    if (!columns.setupCompleted) {
      await queryInterface.addColumn(TABLE_NAME, 'setupCompleted', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    // Add companyName if it doesn't exist
    if (!columns.companyName) {
      await queryInterface.addColumn(TABLE_NAME, 'companyName', {
        type: DataTypes.STRING(255),
        allowNull: true
      });
    }

    // Add tokenVersion if it doesn't exist
    if (!columns.tokenVersion) {
      await queryInterface.addColumn(TABLE_NAME, 'tokenVersion', {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }

    // Update role check constraint to include new roles
    await queryInterface.sequelize.query(`
      ALTER TABLE "${TABLE_NAME}"
      DROP CONSTRAINT IF EXISTS "users_role_check";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "${TABLE_NAME}"
      ADD CONSTRAINT "users_role_check"
      CHECK (role IN ('USER', 'ANALYST', 'ADMIN', 'SYSTEM', 'COMPANY'));
    `);

    // Add index for company name if it doesn't exist
    const indexes = (await queryInterface.showIndex(TABLE_NAME)) as TableIndex[];
    const hasCompanyNameIndex = indexes.some(index => index.name === 'users_company_name_idx');
    
    if (!hasCompanyNameIndex) {
      await queryInterface.addIndex(TABLE_NAME, ['companyName'], {
        name: 'users_company_name_idx'
      });
    }
  },

  async down(queryInterface: QueryInterface) {
    const columns = await queryInterface.describeTable(TABLE_NAME);
    const indexes = (await queryInterface.showIndex(TABLE_NAME)) as TableIndex[];

    // Remove index if it exists
    if (indexes.some(index => index.name === 'users_company_name_idx')) {
      await queryInterface.removeIndex(TABLE_NAME, 'users_company_name_idx');
    }

    // Restore original role check constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE "${TABLE_NAME}"
      DROP CONSTRAINT IF EXISTS "users_role_check";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "${TABLE_NAME}"
      ADD CONSTRAINT "users_role_check"
      CHECK (role IN ('USER', 'ANALYST', 'ADMIN', 'SYSTEM'));
    `);

    // Remove columns if they exist
    if (columns.setupCompleted) {
      await queryInterface.removeColumn(TABLE_NAME, 'setupCompleted');
    }
    if (columns.companyName) {
      await queryInterface.removeColumn(TABLE_NAME, 'companyName');
    }
    if (columns.tokenVersion) {
      await queryInterface.removeColumn(TABLE_NAME, 'tokenVersion');
    }
  }
}; 