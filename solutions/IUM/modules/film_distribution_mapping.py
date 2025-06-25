from geopy.geocoders import Nominatim
import time
from typing import Dict, Tuple, List
import pandas as pd
import plotly.graph_objects as go


def get_country_coordinates(countries: set) -> Dict[str, Tuple[float, float]]:
    """
    Ottiene le coordinate geografiche per una lista di paesi.
    Mantiene i commenti originali e gestisce i timeout.

    Args:
        countries: Set di nomi di paesi

    Returns:
        Dizionario {paese: (lat, lon)}
    """
    geolocator = Nominatim(user_agent="my_film_mapping_app")  # Usa un user_agent valido

    coordinates = {}
    for paese in countries:
        try:
            time.sleep(1)  # Aggiungi un ritardo di 1 secondo tra le richieste
            location = geolocator.geocode(paese)
            if location:
                coordinates[paese] = (location.latitude, location.longitude)
            else:
                coordinates[paese] = (None, None)
        except:
            coordinates[paese] = (None, None)

    # Rimuovi paesi per cui non sono state trovate coordinate (NaN)
    return {k: v for k, v in coordinates.items() if v != (None, None)}


def prepare_distribution_data(
        df: pd.DataFrame,
        coordinates: Dict[str, Tuple[float, float]]
) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, str]]:
    """
    Prepara i dati per la mappa di distribuzione.
    Mantiene tutti i commenti originali.

    Args:
        df: DataFrame con i dati dei film
        coordinates: Dizionario delle coordinate paese

    Returns:
        Tuple con:
        - DataFrame filtrato
        - DataFrame con i conteggi massimi
        - Dizionario dei colori per nazione
    """
    # Filtra il DataFrame per rimuovere paesi senza coordinate
    df_filtered = df[df["country"].isin(coordinates.keys()) & df["country_of_release"].isin(coordinates.keys())]

    # Calcola il numero di rilasci per ogni coppia
    conteggio_rilsci = df_filtered.groupby(["country", "country_of_release"]).size().reset_index(name="count")

    # Trova il paese di distribuzione con il maggior numero di rilasci
    max_rilsci = conteggio_rilsci.loc[conteggio_rilsci.groupby("country")["count"].idxmax()]

    # Assegna un colore univoco a ogni nazione
    colori_nazioni = {
        paese: f"hsl({i * 360 / len(coordinates)}, 70%, 50%)"  # Usa una tonalità diversa per ogni paese
        for i, paese in enumerate(coordinates.keys())
    }

    return df_filtered, max_rilsci, colori_nazioni


def plot_distribution_map(
        coordinates: Dict[str, Tuple[float, float]],
        max_rilsci: pd.DataFrame,
        colori_nazioni: Dict[str, str],
        title: str = "Distribuzione dei film per paese",
        width: int = 1000,
        height: int = 700
) -> None:
    """
    Crea la mappa interattiva di distribuzione dei film.

    Args:
        coordinates: Dizionario delle coordinate paese
        max_rilsci: DataFrame con i conteggi massimi
        colori_nazioni: Dizionario dei colori
        title: Titolo del grafico
        width: Larghezza mappa
        height: Altezza mappa
    """
    # Creazione delle linee (frecce)
    linee = []
    for _, row in max_rilsci.iterrows():
        paese_prod = row["country"]
        paese_dist = row["country_of_release"]

        linee.append(
            go.Scattergeo(
                locationmode="country names",
                lon=[coordinates[paese_prod][1], coordinates[paese_dist][1]],
                lat=[coordinates[paese_prod][0], coordinates[paese_dist][0]],
                mode="lines",
                line=dict(width=1, color=colori_nazioni[paese_prod]),
                opacity=0.8,
                hoverinfo="none",
            )
        )

    # Creazione della mappa
    fig = go.Figure()

    # Aggiungi le nazioni colorate
    for paese, coord in coordinates.items():
        arco_uscita = max_rilsci[max_rilsci["country"] == paese]
        hovertext = f"{paese} → {arco_uscita.iloc[0]['country_of_release']}: {arco_uscita.iloc[0]['count']} rilasci" if not arco_uscita.empty else paese

        fig.add_trace(
            go.Scattergeo(
                locationmode="country names",
                lon=[coord[1]],
                lat=[coord[0]],
                mode="markers",
                marker=dict(size=10, color=colori_nazioni[paese]),
                hoverinfo="text",
                hovertext=hovertext,
                name=paese
            )
        )

    # Aggiungi le linee
    for linea in linee:
        fig.add_trace(linea)

    # Configurazione mappa
    fig.update_geos(
        showcountries=True,
        countrycolor="black",
        showland=True,
        landcolor="rgb(243, 243, 243)",
        oceancolor="rgb(204, 204, 255)",
        bgcolor="rgb(240, 240, 240)",
    )

    fig.update_layout(
        title=title,
        showlegend=False,
        width=width,
        height=height,
        margin=dict(l=0, r=0, t=40, b=0),
    )

    fig.show()