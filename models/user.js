'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Define association here
      User.belongsTo(models.BillingPlan, {
        foreignKey: 'billingPlanId',
        as: 'billingPlan',
      });
    }
  }
  User.init({
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: DataTypes.STRING,
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'email',
    },
    googleId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    accessToken: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
}