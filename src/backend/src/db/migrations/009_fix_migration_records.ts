/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    try {
      // Delete problematic migration records
      await queryInterface.sequelize.query(`
        DELETE FROM "SequelizeMeta" 
        WHERE name IN (
          '007_create_audit_logs.ts',
          '20240318000000_create_audit_logs.ts'
        );
      `);

      // Insert the correct migration record
      await queryInterface.sequelize.query(`
        INSERT INTO "SequelizeMeta" (name) 
        VALUES ('20240318000000_create_audit_logs.ts');
      `);
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface) {
    try {
      // Revert the changes
      await queryInterface.sequelize.query(`
        DELETE FROM "SequelizeMeta" 
        WHERE name = '20240318000000_create_audit_logs.ts';
      `);

      await queryInterface.sequelize.query(`
        INSERT INTO "SequelizeMeta" (name) 
        VALUES ('007_create_audit_logs.ts');
      `);
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  },
};
