'use strict';
const {
    Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class BillingPlan extends Model {
        static associate(models) {
            BillingPlan.hasMany(models.User, {
                foreignKey: 'billingPlanId',
                as: 'users',
            });
        }
    }
    BillingPlan.init({
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        price: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        duration: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        features: DataTypes.JSON,
    }, {
        sequelize,
        modelName: 'BillingPlan',
    });
    return BillingPlan;
};