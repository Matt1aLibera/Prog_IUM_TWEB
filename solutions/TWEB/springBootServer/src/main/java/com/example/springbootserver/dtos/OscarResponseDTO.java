package com.example.springbootserver.dtos;

import com.example.springbootserver.models.OscarAward;

public class OscarResponseDTO {
    private String category;
    private Integer yearCeremony;
    private Boolean winner;
    private String nomineeName;

    // Costruttore da OscarAward
    public OscarResponseDTO(OscarAward award) {
        this.category = award.getCategory();
        this.yearCeremony = award.getYearCeremony();
        this.winner = award.getWinner();
        this.nomineeName = award.getName();
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Integer getYearCeremony() {
        return yearCeremony;
    }

    public void setYearCeremony(Integer yearCeremony) {
        this.yearCeremony = yearCeremony;
    }

    public Boolean getWinner() {
        return winner;
    }

    public void setWinner(Boolean winner) {
        this.winner = winner;
    }

    public String getNomineeName() {
        return nomineeName;
    }

    public void setNomineeName(String nomineeName) {
        this.nomineeName = nomineeName;
    }
}